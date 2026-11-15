"""Private attachment storage (D-013) and media-storage configuration guards.

The attachment round-trip runs against the default local storage. The S3 path is
exercised at the configuration level only: wiring it to a live bucket needs owner
credentials, which this milestone is not allowed to create.
"""

import os
import shutil
import subprocess
import sys
import tempfile

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.core.testutils import make_customer
from apps.events.models import EventAttachment

EVENTS = "/api/v1/events/"

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def attachment_url(event_id, suffix=""):
    return f"{EVENTS}{event_id}/attachments/{suffix}"


class AttachmentStorageTests(TestCase):
    def setUp(self):
        media_root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, media_root, True)
        override = override_settings(MEDIA_ROOT=media_root)
        override.enable()
        self.addCleanup(override.disable)

        self.customer = make_customer("attach-owner@example.com")
        self.other = make_customer("attach-other@example.com")
        self.client = APIClient()
        self.client.force_authenticate(self.customer)
        created = self.client.post(
            EVENTS,
            {
                "name": "Terrace supper",
                "event_type": "Private dinner",
                "event_date": "2030-04-18",
                "start_time": "18:30",
                "end_time": "22:30",
                "guest_count": 20,
                "pin_code": "560001",
                "locality": "MG Road",
                "city": "Bengaluru",
                "state": "Karnataka",
                "requirements": [
                    {"category": "photography", "title": "Two-hour coverage", "budget_paise": 800000}
                ],
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.content)
        self.event_id = created.data["id"]

    def upload(self, client=None, name="brief.png", payload=PNG_BYTES, content_type="image/png"):
        client = client or self.client
        return client.post(
            attachment_url(self.event_id),
            {"file": SimpleUploadedFile(name, payload, content_type=content_type)},
            format="multipart",
        )

    def test_owner_can_upload_and_download_private_attachment(self):
        response = self.upload()
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["content_type"], "image/png")
        self.assertEqual(response.data["size_bytes"], len(PNG_BYTES))

        attachment = EventAttachment.objects.get(id=response.data["id"])
        stored = attachment.file.name.replace("\\", "/")
        # Stored under the owning event, never at a guessable top-level path.
        self.assertIn(f"events/{self.event_id}/", stored, stored)
        self.assertTrue(os.path.exists(attachment.file.path))

        download = self.client.get(attachment_url(self.event_id, f"{attachment.id}/download/"))
        self.assertEqual(download.status_code, 200)
        self.assertEqual(b"".join(download.streaming_content), PNG_BYTES)
        # A private file must never be storable by a shared cache.
        self.assertEqual(download["Cache-Control"], "private, no-store")

    def test_download_url_authorises_through_the_api_not_storage(self):
        response = self.upload()
        self.assertEqual(response.status_code, 201, response.content)
        download_url = response.data["download_url"]
        self.assertTrue(download_url.startswith(f"{EVENTS}{self.event_id}/attachments/"))
        self.assertIn("/download/", download_url)
        # Exposing a storage path or MEDIA_URL would bypass authorization.
        self.assertNotIn(settings.MEDIA_URL, download_url)
        self.assertNotIn("http", download_url)

    def test_another_customer_cannot_download_or_list(self):
        response = self.upload()
        attachment_id = response.data["id"]

        stranger = APIClient()
        stranger.force_authenticate(self.other)
        # Denied either as "not yours" (403) or "not found" (404); never served.
        download = stranger.get(attachment_url(self.event_id, f"{attachment_id}/download/"))
        self.assertIn(download.status_code, (403, 404))
        self.assertNotIn(PNG_BYTES, download.content)

        # The collection is owner-scoped, so a stranger sees nothing: either a
        # denial or an empty page, never another customer's attachment.
        listing = stranger.get(attachment_url(self.event_id))
        self.assertIn(listing.status_code, (200, 403, 404))
        self.assertNotIn(str(attachment_id), listing.content.decode("utf-8", "ignore"))

    def test_anonymous_cannot_download_or_upload(self):
        response = self.upload()
        attachment_id = response.data["id"]

        anonymous = APIClient()
        download = anonymous.get(attachment_url(self.event_id, f"{attachment_id}/download/"))
        self.assertIn(download.status_code, (401, 403))
        upload = anonymous.post(attachment_url(self.event_id), {}, format="multipart")
        self.assertIn(upload.status_code, (401, 403))

    def test_mismatched_file_type_is_rejected(self):
        response = self.upload(
            name="payload.html",
            payload=b"<html><script>alert(1)</script></html>",
            content_type="image/png",
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertEqual(EventAttachment.objects.count(), 0)


class MediaStorageConfigurationTests(TestCase):
    """The storage switch must fail loudly instead of silently falling back."""

    def run_check(self, **env_overrides):
        env = dict(os.environ)
        # Guarantee the guard is what trips, not a leftover value in .env.
        env["AWS_STORAGE_BUCKET_NAME"] = ""
        env.update(env_overrides)
        return subprocess.run(
            [sys.executable, "manage.py", "check"],
            capture_output=True,
            text=True,
            env=env,
            cwd=settings.BASE_DIR,
        )

    def test_unknown_media_storage_backend_is_rejected(self):
        result = self.run_check(MEDIA_STORAGE="gcs")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("MEDIA_STORAGE", result.stdout + result.stderr)

    def test_s3_without_bucket_is_rejected(self):
        result = self.run_check(MEDIA_STORAGE="s3")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("AWS_STORAGE_BUCKET_NAME", result.stdout + result.stderr)

    def test_s3_with_bucket_wires_the_s3_backend(self):
        env = dict(os.environ)
        env.update(
            {
                "MEDIA_STORAGE": "s3",
                "AWS_STORAGE_BUCKET_NAME": "hiddenstage-test-bucket",
                "AWS_S3_REGION_NAME": "ap-south-1",
            }
        )
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                "import django,os;"
                "os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings');"
                "django.setup();"
                "from django.core.files.storage import storages;"
                "print(type(storages['default']).__name__)",
            ],
            capture_output=True,
            text=True,
            env=env,
            cwd=settings.BASE_DIR,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("S3Storage", result.stdout)
