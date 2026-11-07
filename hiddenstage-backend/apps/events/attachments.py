"""Attachment validation and the malware-scanning integration point (D-013).

No scanning vendor is approved. `scan_attachment` is the single seam where a
scanner plugs in; it must be called before a download is authorised when a vendor
is configured. Attachments stay private regardless.
"""

import logging

from django.conf import settings
from rest_framework.exceptions import ValidationError

from apps.events.models import ScanStatus

logger = logging.getLogger(__name__)

MAGIC_PREFIXES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"RIFF": "image/webp",
    b"%PDF-": "application/pdf",
}


def detect_content_type(head: bytes) -> str | None:
    """Return a MIME type only when the file signature matches an allowed type."""
    for prefix, content_type in MAGIC_PREFIXES.items():
        if head.startswith(prefix):
            if content_type == "image/webp" and head[8:12] != b"WEBP":
                continue
            return content_type
    return None


def validate_attachment_upload(*, upload, declared_type: str | None, existing_count: int):
    max_bytes = settings.ATTACHMENT_MAX_BYTES
    allowed = settings.ATTACHMENT_ALLOWED_CONTENT_TYPES

    if existing_count >= settings.ATTACHMENT_MAX_PER_EVENT:
        raise ValidationError(
            {"attachments": f"An event can hold at most {settings.ATTACHMENT_MAX_PER_EVENT} attachments."}
        )
    if upload.size <= 0:
        raise ValidationError({"file": "The file is empty."})
    if upload.size > max_bytes:
        raise ValidationError(
            {"file": f"Files must be {max_bytes // (1024 * 1024)} MB or smaller."}
        )

    upload.seek(0)
    head = upload.read(16)
    upload.seek(0)
    detected = detect_content_type(head)
    if detected is None or detected not in allowed:
        raise ValidationError(
            {"file": "Only JPEG, PNG, WebP images and PDF documents are accepted."}
        )
    if declared_type and declared_type != detected:
        raise ValidationError({"file": "The file content does not match its declared type."})
    return detected


def scan_attachment(attachment) -> str:
    """Scanner integration point. Returns a ScanStatus value.

    Without a configured scanner the file is marked SKIPPED, which is recorded
    explicitly rather than being reported as clean.
    """
    return ScanStatus.SKIPPED
