"""Multi-day events, custom service requirements and authorised attachments."""

import shutil
import tempfile
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.testutils import (
    CATEGORY_CODES,
    ensure_categories,
    invite_and_accept,
    make_customer,
    make_event,
    make_provider,
)
from apps.events.models import CustomRequirementReview, Event
from apps.profiles.models import ServiceCategory

EVENTS = "/api/v1/events/"
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def event_payload(**overrides):
    start = timezone.localdate() + timedelta(days=20)
    payload = {
        "name": "Three day festival",
        "event_type": "Festival",
        "event_date": start.isoformat(),
        "end_date": (start + timedelta(days=2)).isoformat(),
        "start_time": "10:00",
        "end_time": "23:00",
        "guest_count": 200,
        "pin_code": "560001",
        "locality": "MG Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "requirements": [{"category": "photography", "title": "Full coverage"}],
    }
    payload.update(overrides)
    return payload


class MultiDayEventTests(TestCase):
    def setUp(self):
        self.customer = make_customer("multiday@example.com")
        self.client = APIClient()
        self.client.force_authenticate(self.customer)
        # The seeded taxonomy includes "other"; ensure_categories keeps the rest.
        ensure_categories()
        ServiceCategory.objects.get_or_create(
            code="other",
            defaults={"name": "Other", "sort_order": 99, "is_active": True},
        )

    def create(self, **overrides):
        return self.client.post(EVENTS, event_payload(**overrides), format="json")

    def test_one_day_event_end_date_equals_start(self):
        start = (timezone.localdate() + timedelta(days=10)).isoformat()
        response = self.create(event_date=start, end_date=start)
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["duration_days"], 1)
        self.assertFalse(response.data["is_multi_day"])

    def test_two_three_and_seven_day_events_persist_their_range(self):
        for days in (2, 3, 7):
            start = timezone.localdate() + timedelta(days=25 + days)
            end = start + timedelta(days=days - 1)
            response = self.create(
                name=f"{days}-day gathering",
                event_date=start.isoformat(),
                end_date=end.isoformat(),
            )
            self.assertEqual(response.status_code, 201, response.content)
            self.assertEqual(response.data["duration_days"], days)
            self.assertEqual(response.data["end_date"], end.isoformat())
            stored = Event.objects.get(id=response.data["id"])
            self.assertEqual(stored.end_date, end)

    def test_end_date_before_start_is_rejected(self):
        start = timezone.localdate() + timedelta(days=30)
        response = self.create(
            event_date=start.isoformat(),
            end_date=(start - timedelta(days=1)).isoformat(),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("end_date", response.data)

    def test_moving_start_beyond_end_date_is_rejected_without_silent_overwrite(self):
        start = timezone.localdate() + timedelta(days=30)
        created = self.create(
            event_date=start.isoformat(),
            end_date=(start + timedelta(days=2)).isoformat(),
        )
        self.assertEqual(created.status_code, 201, created.content)
        new_start = start + timedelta(days=5)
        response = self.client.patch(
            f"{EVENTS}{created.data['id']}/",
            {"event_date": new_start.isoformat()},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("end_date", response.data)
        stored = Event.objects.get(id=created.data["id"])
        self.assertEqual(stored.end_date, start + timedelta(days=2))
        self.assertEqual(stored.event_date, start)

    def test_omitting_end_date_defaults_to_a_one_day_event(self):
        start = timezone.localdate() + timedelta(days=12)
        payload = event_payload(event_date=start.isoformat())
        payload.pop("end_date")
        response = self.client.post(EVENTS, payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["end_date"], start.isoformat())

    def test_existing_internal_events_without_end_date_still_work(self):
        # create_event_with_requirements is the internal entry point used by tests
        # and older callers; it must not fail now that end_date is required.
        event = make_event(self.customer, submit=False)
        self.assertEqual(event.end_date, event.event_date)


class CustomServiceTests(TestCase):
    def setUp(self):
        self.customer = make_customer("custom@example.com")
        self.client = APIClient()
        self.client.force_authenticate(self.customer)
        ensure_categories()
        ServiceCategory.objects.get_or_create(
            code="other",
            defaults={"name": "Other", "sort_order": 99, "is_active": True},
        )

    def test_custom_requirement_is_stored_on_the_request_only(self):
        before = ServiceCategory.objects.count()
        payload = event_payload(
            requirements=[
                {
                    "category": "other",
                    "custom_service_name": "Drone mapping",
                    "title": "Aerial site map",
                    "description": "Map the venue before setup.",
                }
            ]
        )
        response = self.client.post(EVENTS, payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        requirement = Event.objects.get(id=response.data["id"]).requirements.get()
        self.assertEqual(requirement.custom_service_name, "Drone mapping")
        self.assertTrue(requirement.is_custom)
        self.assertEqual(requirement.display_category_name, "Drone mapping")
        self.assertEqual(requirement.custom_review_status, CustomRequirementReview.PENDING)
        # No new global category was created.
        self.assertEqual(ServiceCategory.objects.count(), before)
        self.assertEqual(response.data["requirements"][0]["custom_service_name"], "Drone mapping")

    def test_other_without_a_custom_name_is_rejected(self):
        payload = event_payload(
            requirements=[{"category": "other", "title": "Something unusual"}]
        )
        response = self.client.post(EVENTS, payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("custom_service_name", str(response.data))

    def test_custom_name_outside_other_is_rejected(self):
        payload = event_payload(
            requirements=[
                {
                    "category": "photography",
                    "custom_service_name": "Drone mapping",
                    "title": "Coverage",
                }
            ]
        )
        response = self.client.post(EVENTS, payload, format="json")
        self.assertEqual(response.status_code, 400)


class AttachmentAuthorisationTests(TestCase):
    def setUp(self):
        media_root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, media_root, True)
        override = override_settings(MEDIA_ROOT=media_root)
        override.enable()
        self.addCleanup(override.disable)

        self.customer = make_customer("attach-multi@example.com")
        self.invited_provider = make_provider("invited@example.com")
        self.stranger_provider = make_provider("stranger@example.com")
        self.event = make_event(self.customer, submit=False)
        invite_and_accept(self.event, self.invited_provider)
        self.client = APIClient()
        self.client.force_authenticate(self.customer)
        self.uploaded = self.client.post(
            f"{EVENTS}{self.event.id}/attachments/",
            {
                "file": SimpleUploadedFile(
                    "floor plan.png", PNG_BYTES, content_type="image/png"
                )
            },
            format="multipart",
        )
        self.assertEqual(self.uploaded.status_code, 201, self.uploaded.content)
        self.attachment_id = self.uploaded.data["id"]

    def download_url(self):
        return f"{EVENTS}{self.event.id}/attachments/{self.attachment_id}/download/"

    def test_owner_downloads_their_attachment(self):
        response = self.client.get(self.download_url())
        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")

    def test_image_preview_is_inline(self):
        response = self.client.get(f"{self.download_url()}?disposition=inline")
        self.assertEqual(response.status_code, 200)
        self.assertIn("inline", response["Content-Disposition"])

    def test_invited_provider_can_download(self):
        client = APIClient()
        client.force_authenticate(self.invited_provider)
        response = client.get(self.download_url())
        self.assertEqual(response.status_code, 200)

    def test_unrelated_provider_is_denied(self):
        client = APIClient()
        client.force_authenticate(self.stranger_provider)
        response = client.get(self.download_url())
        self.assertEqual(response.status_code, 403)

    def test_unrelated_customer_is_denied(self):
        other = make_customer("other-owner@example.com")
        client = APIClient()
        client.force_authenticate(other)
        response = client.get(self.download_url())
        self.assertEqual(response.status_code, 403)

    def test_missing_file_returns_gone_not_a_false_success(self):
        from apps.events.models import EventAttachment

        attachment = EventAttachment.objects.get(id=self.attachment_id)
        attachment.file.delete(save=False)
        response = self.client.get(self.download_url())
        self.assertEqual(response.status_code, 410)

    def test_deleted_attachment_is_not_found(self):
        self.client.delete(f"{EVENTS}{self.event.id}/attachments/{self.attachment_id}/")
        response = self.client.get(self.download_url())
        self.assertEqual(response.status_code, 404)

    def test_directory_components_are_stripped_from_the_download_name(self):
        from pathlib import Path

        from apps.events.views import _safe_filename

        self.assertEqual(_safe_filename("../../etc/passwd"), "passwd")
        self.assertEqual(Path(_safe_filename('evil"name.png')).name, 'evilname.png')
