"""Administrative verification, moderation, configuration and audit tests."""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.administration.models import AdminAuditAction, AdminAuditLog
from apps.commitments.services import accept_quotation
from apps.core.testutils import (
    PASSWORD,
    invite_and_accept,
    make_customer,
    make_event,
    make_provider,
    submitted_quotation,
)
from apps.events.models import EventStatus
from apps.profiles.models import Business, ServiceCategory, VerificationStatus


class AdminAuthorizationTests(TestCase):
    def setUp(self):
        self.customer = make_customer("cust@example.com")
        self.provider = make_provider("prov@example.com")
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password=PASSWORD, full_name="Platform Admin"
        )
        self.admin.mark_email_verified()

    def test_non_staff_and_anonymous_cannot_access_admin_routes(self):
        endpoints = [
            "/api/v1/admin/overview/",
            "/api/v1/admin/users/",
            "/api/v1/admin/providers/",
            "/api/v1/admin/businesses/",
            "/api/v1/admin/events/",
            "/api/v1/admin/commitments/",
            "/api/v1/admin/categories/",
            "/api/v1/admin/audit/",
        ]
        anon = APIClient()
        cust_client = APIClient()
        cust_client.force_authenticate(self.customer)
        prov_client = APIClient()
        prov_client.force_authenticate(self.provider)

        for url in endpoints:
            self.assertIn(anon.get(url).status_code, (401, 403), url)
            self.assertEqual(cust_client.get(url).status_code, 403, url)
            self.assertEqual(prov_client.get(url).status_code, 403, url)

    def test_staff_user_can_access_overview_and_auth_me_exposes_staff_flags(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        me = client.get("/api/v1/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertTrue(me.data["is_staff"])
        self.assertTrue(me.data["is_superuser"])

        overview = client.get("/api/v1/admin/overview/")
        self.assertEqual(overview.status_code, 200)
        self.assertIn("metrics", overview.data)
        self.assertIn("recent_audit", overview.data)


class AdminWorkflowTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@example.com", password=PASSWORD, full_name="Platform Admin"
        )
        self.admin.mark_email_verified()
        self.customer = make_customer("cust@example.com")
        self.provider = make_provider("prov@example.com")
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_provider_verification_updates_status_and_logs_audit(self):
        profile = self.provider.provider_profile
        res = self.client.post(
            f"/api/v1/admin/providers/{profile.id}/verification/",
            {"verification_status": VerificationStatus.VERIFIED, "note": "Documents checked"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.data["verification_status"], VerificationStatus.VERIFIED)
        self.assertTrue(
            AdminAuditLog.objects.filter(
                action=AdminAuditAction.PROVIDER_VERIFICATION_UPDATED,
                target_id=str(profile.id),
            ).exists()
        )

    def test_user_moderation_and_self_lockout_guard(self):
        # Cannot deactivate self
        res_self = self.client.patch(
            f"/api/v1/admin/users/{self.admin.id}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(res_self.status_code, 400)

        # Can deactivate another user and audit it
        res_other = self.client.patch(
            f"/api/v1/admin/users/{self.customer.id}/",
            {"is_active": False, "note": "Policy hold"},
            format="json",
        )
        self.assertEqual(res_other.status_code, 200, res_other.content)
        self.assertFalse(res_other.data["is_active"])
        self.assertTrue(
            AdminAuditLog.objects.filter(
                action=AdminAuditAction.USER_UPDATED, target_id=str(self.customer.id)
            ).exists()
        )

    def test_business_event_commitment_and_category_workflows(self):
        business = Business.objects.create(name="Studio One", city="Bengaluru", state="Karnataka")
        r_biz = self.client.patch(
            f"/api/v1/admin/businesses/{business.id}/",
            {"is_active": False, "note": "Paused"},
            format="json",
        )
        self.assertEqual(r_biz.status_code, 200)
        self.assertFalse(r_biz.data["is_active"])

        # Event withdrawal
        ev = make_event(self.customer, submit=True)
        r_wd = self.client.post(
            f"/api/v1/admin/events/{ev.id}/withdraw/",
            {"reason": "Duplicate listing"},
            format="json",
        )
        self.assertEqual(r_wd.status_code, 200)
        self.assertEqual(r_wd.data["status"], EventStatus.WITHDRAWN)

        # Commitment release
        ev2 = make_event(self.customer, submit=True)
        invite_and_accept(ev2, self.provider)
        q = submitted_quotation(self.provider, ev2)
        commit = accept_quotation(
            actor=self.customer,
            quotation_id=q.id,
            revision_id=q.current_revision.id,
            requirement_ids=[ev2.requirements.first().id],
        )
        r_rel = self.client.post(
            f"/api/v1/admin/commitments/{commit.id}/release/",
            {"reason": "Mutual cancellation via support"},
            format="json",
        )
        self.assertEqual(r_rel.status_code, 200)
        self.assertEqual(r_rel.data["status"], "RELEASED")

        # Category create & update
        r_cat = self.client.post(
            "/api/v1/admin/categories/",
            {"code": "lighting-rig", "name": "Lighting Rig", "sort_order": 50, "is_active": True},
            format="json",
        )
        self.assertEqual(r_cat.status_code, 201, r_cat.content)
        cat_id = r_cat.data["id"]
        r_cat_upd = self.client.patch(
            f"/api/v1/admin/categories/{cat_id}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(r_cat_upd.status_code, 200)
        self.assertFalse(r_cat_upd.data["is_active"])
        self.assertFalse(ServiceCategory.objects.get(pk=cat_id).is_active)

        # Unified audit trail returns both admin and commitment entries
        r_audit = self.client.get("/api/v1/admin/audit/")
        self.assertEqual(r_audit.status_code, 200)
        sources = {row["source"] for row in r_audit.data}
        self.assertEqual(sources, {"admin", "commitments"})

