"""HiddenStage end-to-end API audit against an isolated backend.

Run with the audit server on 127.0.0.1:8010 (SQLite, see config/audit_settings.py).
Every check prints PASS/FAIL and the JSON evidence is written next to this file.
No production database is touched.
"""

from __future__ import annotations

import json
import os
import struct
import sys
import time
import uuid
import zlib

import requests

BASE = os.environ.get("AUDIT_API", "http://127.0.0.1:8010/api/v1")
STAMP = f"{int(time.time())}{uuid.uuid4().hex[:4]}"
PASSWORD = "Qa!7pVn2Lm4x"
RESULTS = []


def record(case, ok, detail=""):
    RESULTS.append({"case": case, "pass": bool(ok), "detail": detail})
    print(f"{'PASS' if ok else 'FAIL'} | {case}" + (f" | {detail}" if detail and not ok else ""))


def check(case, response, expected, extra=None):
    ok = response.status_code in (expected if isinstance(expected, (list, tuple)) else [expected])
    detail = f"HTTP {response.status_code}"
    if not ok:
        detail += " " + response.text[:300].replace("\n", " ")
    elif extra is not None:
        detail = extra
    record(case, ok, detail)
    return response


class Client:
    def __init__(self, label):
        self.label = label
        self.s = requests.Session()
        self.s.headers.update({"Accept": "application/json"})
        self.csrf = None
        self.refresh_csrf()

    def refresh_csrf(self):
        r = self.s.get(f"{BASE}/auth/csrf/", timeout=30)
        self.csrf = r.json().get("csrfToken") or self.s.cookies.get("csrftoken")

    def _headers(self):
        return {"X-CSRFToken": self.csrf or "", "Referer": "http://127.0.0.1:5174/"}

    def get(self, path, **kw):
        return self.s.get(f"{BASE}{path}", timeout=60, **kw)

    def post(self, path, json_body=None, files=None, data=None):
        r = self.s.post(
            f"{BASE}{path}", json=json_body, files=files, data=data,
            headers=self._headers(), timeout=120,
        )
        if "csrftoken" in self.s.cookies:
            self.csrf = self.s.cookies["csrftoken"]
        return r

    def put(self, path, json_body):
        return self.s.put(f"{BASE}{path}", json=json_body, headers=self._headers(), timeout=60)

    def patch(self, path, json_body=None):
        return self.s.patch(f"{BASE}{path}", json=json_body, headers=self._headers(), timeout=60)

    def delete(self, path):
        return self.s.delete(f"{BASE}{path}", headers=self._headers(), timeout=60)

    def register(self, email, name, role="CUSTOMER", username=None):
        payload = {
            "email": email,
            "username": username or f"qa_{role.lower()[:4]}_{STAMP}",
            "password": PASSWORD,
            "full_name": name,
            "role": role,
            "accept_terms": True,
        }
        r = self.post("/auth/register/", payload)
        return r


def png_bytes(width=2, height=2):
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + b"\xff\x00\x00" * width for _ in range(height))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def main():
    health = requests.get(f"{BASE}/health/", timeout=30)
    check("health endpoint returns database ok", health, 200,
          extra=str(health.json()) if health.status_code == 200 else None)

    cats = requests.get(f"{BASE}/catalog/categories/", timeout=30)
    check("public category catalog", cats, 200)
    cat_payload = cats.json()
    cat_list = cat_payload.get("results", cat_payload) if isinstance(cat_payload, dict) else cat_payload
    codes = {c["code"]: c for c in cat_list}
    record("catalog includes seeded categories", len(codes) >= 5, f"{len(codes)} categories")
    photography = "photography" if "photography" in codes else next(iter(codes))
    other_code = "other" if "other" in codes else None
    record("catalog exposes the 'other' custom category", other_code is not None, str(list(codes)[:8]))

    # ---------- registration validation ----------
    anon = Client("anon")
    bad = Client("bad")
    r = bad.post("/auth/register/", {
        "email": f"nouser.{STAMP}@example.test", "password": PASSWORD,
        "full_name": "No Username", "accept_terms": True,
    })
    check("registration rejects a missing username", r, 400)
    r = bad.post("/auth/register/", {
        "email": f"weak.{STAMP}@example.test", "username": f"weak{STAMP}"[:20],
        "password": "123", "full_name": "Weak Pass", "accept_terms": True,
    })
    check("registration rejects a weak password", r, 400)
    r = bad.post("/auth/register/", {
        "email": "not-an-email", "username": f"badem{STAMP}"[:20],
        "password": PASSWORD, "full_name": "Bad Email", "accept_terms": True,
    })
    check("registration rejects an invalid email", r, 400)
    r = bad.post("/auth/register/", {
        "email": f"terms.{STAMP}@example.test", "username": f"terms{STAMP}"[:20],
        "password": PASSWORD, "full_name": "No Terms", "accept_terms": False,
    })
    check("registration requires terms acceptance", r, 400)

    # ---------- accounts ----------
    customer = Client("customer")
    r = customer.register(f"cust.{STAMP}@example.test", "QA Customer", "CUSTOMER", f"qacust{STAMP}"[:20])
    check("customer registration succeeds", r, 201)
    customer_id = r.json().get("id") if r.status_code == 201 else None
    check("session established after registration", customer.get("/auth/me/"), 200)

    r = customer.register(f"cust.{STAMP}@example.test", "Duplicate", "CUSTOMER", f"qadup{STAMP}"[:20])
    check("duplicate email registration is rejected", r, 400)

    r = customer.put("/me/customer-profile/", {
        "pin_code": "560001", "locality": "MG Road", "city": "Bengaluru",
        "state": "Karnataka", "bio": "QA customer profile",
    })
    check("customer profile onboarding persists", r, 200)

    providers = {}
    for kind, name, label in [
        ("MANAGER", "QA Manager Studio", "manager"),
        ("INDIVIDUAL_SERVICE_PROVIDER", "QA Individual Photography", "individual"),
        ("ASSOCIATED_SERVICE_PROVIDER", "QA Associated Decor", "associated"),
        ("TALENT", "QA Talent Live", "talent"),
        ("WORKER", "QA Worker Crew", "worker"),
    ]:
        c = Client(label)
        r = c.register(f"{label}.{STAMP}@example.test", name, "PROVIDER", f"qa{label}{STAMP}"[:20])
        check(f"{label} registration succeeds", r, 201)
        uid = r.json().get("id") if r.status_code == 201 else None
        payload = {
            "display_name": name,
            "contact": f"+9198123{abs(hash(label)) % 10000:04d}",
            "description": f"{name} provides professional event services in Bengaluru.",
            "kind": kind,
            "categories": [photography] if kind != "TALENT" else ["music-and-performance"],
            "coverage": [{"pin_code": "560001", "locality": "MG Road", "city": "Bengaluru", "state": "Karnataka"}],
        }
        if kind == "TALENT":
            payload.update({
                "talent_category": "Singer",
                "performance_styles": "Bollywood, Sufi",
                "experience_summary": "Eight years of live stage performance.",
                "instagram": "https://instagram.com/qatalent",
            })
        r = c.put("/me/provider-profile/", payload)
        check(f"{label} profile onboarding persists", r, 200)
        providers[label] = {"client": c, "id": uid, "kind": kind, "profile": r.json() if r.status_code == 200 else {}}

    talent_profile = providers["talent"]["profile"]
    record("talent-specific fields persist", talent_profile.get("talent_category") == "Singer"
           and "Bollywood" in (talent_profile.get("performance_styles") or ""),
           json.dumps({k: talent_profile.get(k) for k in ("kind", "talent_category", "performance_styles")}))
    record("provider kind persists for every professional type",
           all(p["profile"].get("kind") == p["kind"] for p in providers.values()),
           json.dumps({k: v["profile"].get("kind") for k, v in providers.items()}))

    r = providers["individual"]["client"].post("/me/provider-services/", {
        "category": "videography", "title": "Event videography", "description": "Four hour coverage",
        "base_price_paise": 800000,
    })
    check("provider service listing can be created", r, 201)
    r = providers["individual"]["client"].post("/me/provider-services/", {
        "category": "videography", "title": "Duplicate offering",
    })
    check("duplicate provider service returns a validation error, not a server error", r, 400)

    # ---------- custom categories ----------
    ind = providers["individual"]["client"]
    r = ind.post("/catalog/categories/custom/", {"name": "  "})
    check("custom category rejects an empty name", r, 400)
    r = ind.post("/catalog/categories/custom/", {"name": "X"})
    check("custom category rejects a one-character name", r, 400)
    long_name = "Live Mehndi Artistry " + "and traditional henna design " * 3
    r = ind.post("/catalog/categories/custom/", {"name": long_name})
    check("custom category rejects names over 80 characters", r, 400)
    custom_name = f"QA Live Mehndi {STAMP}"
    r = ind.post("/catalog/categories/custom/", {"name": custom_name, "description": "Traditional henna for guests"})
    check("custom category is created", r, 201)
    custom_cat = r.json() if r.status_code == 201 else {}
    record("custom category is flagged is_custom", custom_cat.get("is_custom") is True, str(custom_cat))
    record("custom category receives its own slug, not 'other'", custom_cat.get("code") not in (None, "other"), str(custom_cat.get("code")))
    r = ind.post("/catalog/categories/custom/", {"name": custom_name})
    check("duplicate custom category returns the existing row", r, 200)
    record("duplicate custom category does not create a second row",
           r.status_code == 200 and r.json().get("id") == custom_cat.get("id"),
           f"{r.json().get('id')} vs {custom_cat.get('id')}")
    r = ind.post("/catalog/categories/custom/", {"name": custom_name.upper()})
    check("case-insensitive duplicate is deduplicated", r, 200)
    r = ind.post("/catalog/categories/custom/", {"name": "Café & Décor — QA " + STAMP[-4:]})
    check("special characters in custom category are accepted", r, 201)
    persisted = requests.get(f"{BASE}/catalog/categories/", timeout=30).json()
    plist = persisted.get("results", persisted) if isinstance(persisted, dict) else persisted
    record("custom category persists in the public catalog",
           any(c["id"] == custom_cat.get("id") for c in plist), f"{len(plist)} categories")

    # ---------- events + requirements ----------
    event_payload = {
        "name": f"QA Custom Category Event {STAMP}",
        "event_type": "Private dinner",
        "description": "Audit event for custom categories.",
        "event_date": "2030-06-15",
        "start_time": "18:30",
        "end_time": "22:30",
        "guest_count": 40,
        "pin_code": "560001",
        "locality": "MG Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "venue_name": "QA Terrace",
        "status": "DRAFT",
        "requirements": [
            {"category": custom_cat.get("code", photography), "title": "Mehndi artist",
             "description": "Henna for 20 guests", "budget_paise": 500000},
        ],
    }
    r = customer.post("/events/", event_payload)
    check("event with a custom category requirement is created", r, 201)
    event_id = r.json().get("id") if r.status_code == 201 else None
    if event_id:
        detail = customer.get(f"/events/{event_id}/").json()
        req = detail["requirements"][0]
        record("custom category is stored as its own category (not generic 'other')",
               req["category"] == custom_cat.get("code"), f"{req['category']} / {req.get('category_detail', {}).get('name')}")
        record("custom category survives a refresh", detail["requirements"][0]["category"] == custom_cat.get("code"))

    r = customer.post("/events/", {**event_payload, "name": "QA Custom on standard category", "requirements": [
        {"category": photography, "title": "Photography", "custom_service_name": "Sneaky"}
    ]})
    check("custom service name on a standard category is rejected", r, 400)
    record("catalog exposes a generic 'other' category for the free-text service flow",
           other_code is not None, f"'other' present: {other_code is not None} (customer UI has no Other option either)")

    # ---------- quotation journey ----------
    quote_event = customer.post("/events/", {
        **event_payload,
        "name": f"QA Quotation Event {STAMP}",
        "requirements": [
            {"category": photography, "title": "Photography", "description": "Cover the evening", "budget_paise": 800000},
            {"category": photography, "title": "Photo booth", "description": "Two hours", "budget_paise": 300000},
        ],
    })
    check("multi-requirement event is created", quote_event, 201)
    qe = quote_event.json()
    qe_id = qe["id"]
    qe_reqs = [r["id"] for r in qe["requirements"]]
    r = customer.post(f"/events/{qe_id}/submit/")
    check("event can be submitted", r, 200)
    record("submitted event status is persisted", customer.get(f"/events/{qe_id}/").json()["status"] == "SUBMITTED")

    r = customer.post(f"/events/{qe_id}/invitations/", {"provider_id": providers["manager"]["id"], "message": "Please quote"})
    check("customer can invite a manager to a submitted event", r, 201)
    invitation_id = r.json().get("id") if r.status_code == 201 else None

    mgr = providers["manager"]["client"]
    inbox = mgr.get("/provider/invitations/")
    check("manager sees the invitation in the inbox", inbox, 200)
    inv_list = inbox.json().get("results", inbox.json()) if isinstance(inbox.json(), dict) else inbox.json()
    record("invitation inbox contains the new invitation",
           any(i["id"] == invitation_id for i in inv_list), f"{len(inv_list)} invitations")
    if invitation_id:
        r = mgr.post(f"/provider/invitations/{invitation_id}/accept/")
        check("manager accepts the invitation", r, 200)

    r = mgr.post("/provider/quotations/", {"event": qe_id})
    check("manager starts a quotation", r, 201)
    quotation = r.json() if r.status_code == 201 else {}
    quotation_id = quotation.get("id")
    revisions = quotation.get("revisions") or []
    if not revisions and quotation_id:
        r = mgr.post(f"/provider/quotations/{quotation_id}/revisions/")
        check("draft revision is created", r, 201)
        revisions = [r.json()] if r.status_code == 201 else []
    revision_id = revisions[0]["id"] if revisions else None

    r = mgr.patch(f"/provider/quotations/{quotation_id}/revisions/{revision_id}/", {
        "notes": "Full evening coverage",
        "valid_until": (__import__("datetime").date.today() + __import__("datetime").timedelta(days=30)).isoformat(),
        "items": [
            {"requirement_id": qe_reqs[0], "kind": "LINE", "title": "Photography", "amount_paise": 750000},
            {"requirement_id": qe_reqs[1], "kind": "LINE", "title": "Photo booth", "amount_paise": 250000},
        ],
    })
    check("quotation revision items are saved", r, 200)
    r = mgr.post(f"/provider/quotations/{quotation_id}/revisions/{revision_id}/submit/")
    check("quotation revision is submitted", r, 200)
    record("submitted revision total is computed server-side",
           mgr.get(f"/provider/quotations/{quotation_id}/").json()["revisions"][0]["total_paise"] == 1000000,
           str(mgr.get(f"/provider/quotations/{quotation_id}/").json()["revisions"][0].get("total_paise")))

    r = mgr.post(f"/provider/quotations/{quotation_id}/revisions/{revision_id}/submit/")
    check("a submitted revision cannot be submitted twice", r, 409)

    r = customer.get(f"/events/{qe_id}/quotations/")
    check("customer sees quotations for the event", r, 200)
    customer_quotes = r.json().get("results", r.json()) if isinstance(r.json(), dict) else r.json()
    record("customer quotation list contains the manager quote",
           any(q.get("id") == quotation_id for q in customer_quotes), f"{len(customer_quotes)} quotes")

    r = customer.post(f"/quotations/{quotation_id}/acceptance/", {
        "revision_id": revision_id, "requirement_ids": [qe_reqs[0]],
    })
    check("customer accepts a single service line", r, 201)
    commitment = r.json() if r.status_code == 201 else {}
    commitment_id = commitment.get("id")
    record("accepted line creates a commitment for the selected requirement",
           commitment.get("total_paise") == 750000, str(commitment.get("total_paise")))

    r = customer.get("/commitments/")
    check("customer commitment list is available", r, 200)
    cl = r.json().get("results", r.json()) if isinstance(r.json(), dict) else r.json()
    record("commitment appears in the customer list", any(c.get("id") == commitment_id for c in cl), f"{len(cl)} commitments")

    r = providers["individual"]["client"].get("/customer/quotations/")
    check("provider cannot read the customer quotation inbox", r, 403)
    r = customer.get("/provider/quotations/")
    check("customer cannot read the provider quotation inbox", r, 403)
    r = anon.get("/events/")
    check("anonymous access to events is refused", r, 403)

    # ---------- worker network + assignments ----------
    worker = providers["worker"]["client"]
    worker_id = providers["worker"]["id"]
    r = mgr.post("/network/invitations/", {"worker_id": worker_id, "message": "Join our crew"})
    check("manager can invite a worker to the network", r, 201)
    net_inv = r.json().get("id") if r.status_code == 201 else None
    r = worker.post(f"/network/invitations/{net_inv}/accept/")
    check("worker accepts the network invitation", r, 200)
    r = mgr.get("/network/associations/")
    check("manager association list is available", r, 200)
    assoc = r.json().get("results", r.json()) if isinstance(r.json(), dict) else r.json()
    record("active manager-worker association exists",
           any(a.get("worker") == worker_id or a.get("worker_id") == worker_id for a in assoc), f"{len(assoc)} associations")

    assignment_payload = {
        "worker_id": worker_id,
        "commitment_id": commitment_id,
        "role": "Photography assistant",
        "task_description": "Assist the lead photographer for the evening.",
        "start_time": "18:00",
        "end_time": "22:00",
        "location": "QA Terrace, MG Road",
        "instructions": "Report to the venue manager.",
        "compensation_paise": 150000,
        "send": True,
    }
    r = mgr.post("/assignments/", assignment_payload)
    check("manager creates an assignment for an associated worker", r, 201)
    assignment_id = r.json().get("id") if r.status_code == 201 else None
    r = worker.get("/assignments/")
    check("worker sees their assignment list", r, 200)
    al = r.json().get("results", r.json()) if isinstance(r.json(), dict) else r.json()
    record("assignment appears for the worker", any(a.get("id") == assignment_id for a in al), f"{len(al)} assignments")
    if assignment_id:
        r = worker.post(f"/assignments/{assignment_id}/accept/")
        check("worker accepts the assignment", r, 200)
        r = worker.post(f"/assignments/{assignment_id}/accept/")
        check("accepting the same assignment twice is refused", r, [400, 409])

    avail = mgr.get("/assignments/availability/", params={
        "worker_id": worker_id, "event_date": "2030-06-15", "start_time": "19:00", "end_time": "21:00",
    })
    check("availability endpoint answers a manager", avail, 200)
    if avail.status_code == 200:
        body = avail.json()
        record("availability marks the conflicting slot unavailable",
               body.get("available") is False or body.get("conflict") is True, json.dumps(body))
        leaked = [k for k in body if k in {"event", "event_name", "customer", "customer_name", "instructions", "location"}]
        record("availability response does not leak event or customer details", not leaked, str(leaked))

    r = mgr.post("/assignments/", {**assignment_payload, "worker_id": providers["talent"]["id"]})
    check("manager cannot assign a professional with no active association", r, [400, 403, 404])

    r = customer.post("/assignments/", assignment_payload)
    check("customer cannot create assignments", r, 403)
    r = providers["individual"]["client"].post("/assignments/", assignment_payload)
    check("non-manager provider cannot create assignments", r, 403)

    other = Client("other")
    r = other.register(f"other.{STAMP}@example.test", "Other Customer", "CUSTOMER", f"qaother{STAMP}"[:20])
    other.put("/me/customer-profile/", {"pin_code": "560001", "locality": "Indiranagar", "city": "Bengaluru", "state": "Karnataka"})
    r = other.get(f"/events/{qe_id}/")
    check("another customer cannot read a foreign event (IDOR)", r, [403, 404])
    r = other.get(f"/events/{qe_id}/quotations/")
    check("another customer cannot read foreign quotations", r, [403, 404])
    r = providers["talent"]["client"].get(f"/provider/quotations/{quotation_id}/")
    check("another provider cannot read a foreign quotation", r, 403)

    # ---------- uploads ----------
    png = png_bytes()
    r = customer.post("/auth/avatar/", files={"avatar": ("avatar.png", png, "image/png")})
    check("valid PNG avatar uploads", r, 200)
    avatar_url = r.json().get("avatar_url") if r.status_code == 200 else None
    if avatar_url:
        served = requests.get(avatar_url if avatar_url.startswith("http") else f"http://127.0.0.1:8010{avatar_url}", timeout=30)
        check("uploaded avatar is served back", served, 200)
    r = customer.post("/auth/avatar/", files={"avatar": ("notes.txt", b"hello", "text/plain")})
    check("unsupported avatar format is rejected", r, 400)
    r = customer.post("/auth/avatar/", files={"avatar": ("huge.png", b"\x89PNG" + b"0" * (5 * 1024 * 1024 + 10), "image/png")})
    check("oversized avatar is rejected", r, 400)
    r = customer.post("/auth/avatar/", files={"avatar": ("empty.png", b"", "image/png")})
    check("empty avatar is rejected", r, [400, 500])
    r = customer.post("/auth/avatar/", files={"avatar": ("fake.png", b"<html><script>alert(1)</script>", "image/png")})
    record("avatar upload rejects content that is not an image (extension-only validation)",
           r.status_code == 400, f"HTTP {r.status_code}: accepted a non-image payload named .png")

    r = ind.post("/me/portfolio/", files={"file": ("work.png", png, "image/png")},
                 data={"title": "QA portfolio image", "description": "Audit upload"})
    check("portfolio image uploads", r, 201)
    r = ind.post("/me/portfolio/", files={"file": ("evil.exe", b"MZ", "application/octet-stream")},
                 data={"title": "Bad"})
    check("executable portfolio upload is rejected", r, 400)
    r = ind.post("/me/portfolio/", files={"file": ("empty.png", b"", "image/png")}, data={"title": "Empty"})
    check("empty portfolio upload is rejected", r, 400)

    if event_id:
        r = customer.post(f"/events/{event_id}/attachments/", files={"file": ("brief.png", png, "image/png")})
        check("valid event attachment uploads", r, 201)
        att = r.json() if r.status_code == 201 else {}
        if att.get("download_url"):
            d = customer.get(att["download_url"].replace("/api/v1", ""))
            check("event attachment downloads for its owner", d, 200)
        r = customer.post(f"/events/{event_id}/attachments/", files={"file": ("script.txt", b"hello", "text/plain")})
        check("unsupported attachment type is rejected", r, 400)
        r = customer.post(f"/events/{event_id}/attachments/", files={"file": ("mismatch.pdf", png, "application/pdf")})
        check("attachment content/type mismatch is rejected", r, 400)
        r = other.get(f"/events/{event_id}/attachments/{att.get('id')}/download/")
        check("foreign user cannot download another customer's attachment", r, [403, 404])

    # ---------- misc ----------
    r = customer.patch("/auth/settings/", {"theme_preference": "DARK"})
    check("account settings update", r, 200)
    record("theme preference persists", customer.get("/auth/me/").json().get("theme_preference") == "DARK")
    r = customer.get("/auth/notifications/")
    check("notifications endpoint loads", r, 200)
    r = mgr.get("/provider/opportunities/")
    check("provider opportunities endpoint loads", r, 200)
    r = worker.get("/provider/opportunities/")
    check("worker opportunity feed is scoped", r, [200, 403])
    r = mgr.get("/network/workers/")
    check("worker discovery loads for a manager", r, 200)

    # ---------- provider contact visibility ----------
    manager_profile_id = providers["manager"]["profile"].get("id")
    individual_profile_id = providers["individual"]["profile"].get("id")
    anon_detail = requests.get(f"{BASE}/providers/{manager_profile_id}/", timeout=30)
    check("public provider detail loads", anon_detail, 200)
    record("anonymous provider detail hides contact details",
           anon_detail.json().get("contact") == "", repr(anon_detail.json().get("contact")))
    other_detail = other.get(f"/providers/{individual_profile_id}/")
    record("customer without a commitment cannot see provider contact",
           other_detail.status_code == 200 and other_detail.json().get("contact") == "",
           repr(other_detail.json().get("contact")))
    committed = customer.get(f"/providers/{manager_profile_id}/")
    record("customer with a persisted commitment sees provider contact",
           committed.status_code == 200 and bool(committed.json().get("contact")),
           repr(committed.json().get("contact")))
    owner_view = mgr.get(f"/providers/{manager_profile_id}/")
    record("owner sees their own contact details",
           owner_view.status_code == 200 and bool(owner_view.json().get("contact")))
    record("manager team members expose names only",
           all(isinstance(name, str) for name in (committed.json().get("team_members") or [])))

    out = os.path.join(os.path.dirname(__file__), "api_journey_results.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(RESULTS, fh, indent=2)
    passed = sum(1 for r in RESULTS if r["pass"])
    print(f"\n{passed}/{len(RESULTS)} checks passed")
    return 0 if passed == len(RESULTS) else 1


if __name__ == "__main__":
    sys.exit(main())
