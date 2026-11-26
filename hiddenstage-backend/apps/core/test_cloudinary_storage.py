import os
from django.core.exceptions import ImproperlyConfigured
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.core.storage import DynamicCloudinaryStorage
from apps.core.validators import (
    validate_portfolio_upload,
    validate_chat_attachment,
    MAX_PORTFOLIO_IMAGE_BYTES,
    MAX_PORTFOLIO_VIDEO_BYTES,
    MAX_PORTFOLIO_DOC_BYTES,
    MAX_CHAT_ATTACHMENT_BYTES,
)


class CloudinaryStorageAndLimitsTests(TestCase):
    def test_dynamic_resource_type_detection(self):
        storage = DynamicCloudinaryStorage()
        self.assertEqual(storage.get_resource_type("photo.jpg"), "image")
        self.assertEqual(storage.get_resource_type("logo.png"), "image")
        self.assertEqual(storage.get_resource_type("banner.webp"), "image")
        self.assertEqual(storage.get_resource_type("intro.mp4"), "video")
        self.assertEqual(storage.get_resource_type("clip.mov"), "video")
        self.assertEqual(storage.get_resource_type("document.pdf"), "raw")
        self.assertEqual(storage.get_resource_type("contract.docx"), "raw")
        self.assertEqual(storage.get_resource_type("data.zip"), "raw")

    def test_improperly_configured_when_missing_credentials(self):
        with self.assertRaises(ImproperlyConfigured):
            storage_type = "cloudinary"
            cloudinary_storage_config = {
                "CLOUD_NAME": "",
                "API_KEY": "",
                "API_SECRET": "",
            }
            if storage_type == "cloudinary" and not (
                cloudinary_storage_config.get("CLOUDINARY_URL")
                or (
                    cloudinary_storage_config["CLOUD_NAME"]
                    and cloudinary_storage_config["API_KEY"]
                    and cloudinary_storage_config["API_SECRET"]
                )
            ):
                raise ImproperlyConfigured("Cloudinary credentials required.")

    def test_portfolio_image_upload_limits(self):
        # Valid image
        f = SimpleUploadedFile("portfolio.png", b"fake-png-content", content_type="image/png")
        kind = validate_portfolio_upload(f)
        self.assertEqual(kind, "IMAGE")

        # Oversized image (>10MB)
        huge = SimpleUploadedFile("huge.jpg", b"x" * (MAX_PORTFOLIO_IMAGE_BYTES + 1), content_type="image/jpeg")
        with self.assertRaises(DRFValidationError) as ctx:
            validate_portfolio_upload(huge)
        self.assertIn("must not exceed 10MB", str(ctx.exception))

    def test_portfolio_video_upload_limits(self):
        # Valid video
        f = SimpleUploadedFile("sample.mp4", b"fake-video-content", content_type="video/mp4")
        kind = validate_portfolio_upload(f)
        self.assertEqual(kind, "VIDEO")

        # Oversized video (>50MB)
        huge = SimpleUploadedFile("huge.mp4", b"x" * (MAX_PORTFOLIO_VIDEO_BYTES + 1), content_type="video/mp4")
        with self.assertRaises(DRFValidationError) as ctx:
            validate_portfolio_upload(huge)
        self.assertIn("must not exceed 50MB", str(ctx.exception))

    def test_portfolio_doc_upload_limits(self):
        # Valid PDF document
        f = SimpleUploadedFile("proposal.pdf", b"fake-pdf-content", content_type="application/pdf")
        kind = validate_portfolio_upload(f)
        self.assertEqual(kind, "DOCUMENT")

        # Valid DOCX document
        docx_file = SimpleUploadedFile("contract.docx", b"fake-docx-content", content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        docx_kind = validate_portfolio_upload(docx_file)
        self.assertEqual(docx_kind, "DOCUMENT")

        # Oversized doc (>15MB)
        huge = SimpleUploadedFile("huge.pdf", b"x" * (MAX_PORTFOLIO_DOC_BYTES + 1), content_type="application/pdf")
        with self.assertRaises(DRFValidationError) as ctx:
            validate_portfolio_upload(huge)
        self.assertIn("must not exceed 15MB", str(ctx.exception))

    def test_prohibited_dangerous_and_unsupported_files(self):
        # Dangerous executables
        dangerous = SimpleUploadedFile("script.exe", b"binary", content_type="application/octet-stream")
        with self.assertRaises(DRFValidationError) as ctx:
            validate_portfolio_upload(dangerous)
        self.assertIn("prohibited", str(ctx.exception))

        with self.assertRaises(DRFValidationError) as ctx:
            validate_chat_attachment(dangerous)
        self.assertIn("prohibited", str(ctx.exception))

        # Disallowed file extensions (txt, zip, html, csv, noextension)
        for bad_name in ["notes.txt", "archive.zip", "page.html", "data.csv", "noextension"]:
            bad_file = SimpleUploadedFile(bad_name, b"some content", content_type="application/octet-stream")
            with self.assertRaises(DRFValidationError) as ctx:
                validate_portfolio_upload(bad_file)
            err_str = str(ctx.exception).lower()
            self.assertTrue(any(w in err_str for w in ["allowed", "prohibited", "no extension"]))

            with self.assertRaises(DRFValidationError) as ctx:
                validate_chat_attachment(bad_file)
            err_str = str(ctx.exception).lower()
            self.assertTrue(any(w in err_str for w in ["allowed", "prohibited", "no extension"]))

    def test_chat_attachment_limits(self):
        # Valid attachment
        f = SimpleUploadedFile("brief.pdf", b"pdf-data", content_type="application/pdf")
        validate_chat_attachment(f)

        # Oversize attachment (>15MB)
        huge = SimpleUploadedFile("clip.mp4", b"x" * (MAX_CHAT_ATTACHMENT_BYTES + 1), content_type="video/mp4")
        with self.assertRaises(DRFValidationError) as ctx:
            validate_chat_attachment(huge)
        self.assertIn("must not exceed 15MB", str(ctx.exception))

        # Empty attachment
        empty = SimpleUploadedFile("empty.png", b"", content_type="image/png")
        with self.assertRaises(DRFValidationError):
            validate_chat_attachment(empty)
