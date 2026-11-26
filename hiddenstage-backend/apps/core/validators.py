"""Normalization and validation for Indian address data and phone numbers.

D-012 requires matching normalized PIN codes and localities with city/state
context. Normalization happens on write so equality comparisons in matching are
meaningful, and validation rejects values that cannot be matched safely.
"""

import re

from django.core.exceptions import ValidationError

PIN_CODE_RE = re.compile(r"^[1-9][0-9]{5}$")
INDIAN_MOBILE_RE = re.compile(r"^[6-9][0-9]{9}$")
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_.]{3,50}$")


def normalize_username(value: str) -> str:
    """Normalize username: lowercase, stripped of leading @ and whitespace."""
    if value is None:
        return ""
    return str(value).strip().lstrip("@").lower()


def validate_username(value: str) -> None:
    norm = normalize_username(value)
    if not norm or not USERNAME_RE.match(norm):
        raise ValidationError(
            "Username must be 3-50 characters containing only letters, numbers, underscores, and periods.",
            code="invalid_username",
        )


def normalize_text(value: str) -> str:
    """Trim and collapse internal whitespace without changing letter case."""
    if value is None:
        return ""
    return " ".join(str(value).split())


def normalize_pin_code(value: str) -> str:
    """Strip spaces/hyphens so '560 038' and '560038' compare equal."""
    if value is None:
        return ""
    cleaned = re.sub(r"[\s\-]", "", str(value))
    return cleaned


def validate_pin_code(value: str) -> None:
    if not PIN_CODE_RE.match(normalize_pin_code(value)):
        raise ValidationError(
            "Enter a valid six-digit Indian PIN code.", code="invalid_pin_code"
        )


def normalize_phone(value: str) -> str:
    """Reduce an Indian mobile number to its ten significant digits."""
    if value is None:
        return ""
    cleaned = re.sub(r"[\s\-()]", "", str(value))
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]
    return cleaned


def validate_indian_mobile(value: str) -> None:
    if not INDIAN_MOBILE_RE.match(normalize_phone(value)):
        raise ValidationError(
            "Enter a valid ten-digit Indian mobile number.", code="invalid_phone"
        )


MAX_PORTFOLIO_IMAGE_BYTES = 10 * 1024 * 1024  # 10MB
MAX_PORTFOLIO_VIDEO_BYTES = 50 * 1024 * 1024  # 50MB
MAX_PORTFOLIO_DOC_BYTES = 15 * 1024 * 1024  # 15MB
MAX_CHAT_ATTACHMENT_BYTES = 15 * 1024 * 1024  # 15MB

ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_VIDEO_EXTS = {".mp4", ".mov", ".webm", ".mkv"}
ALLOWED_DOC_EXTS = {".pdf", ".docx"}
ALLOWED_ALL_EXTS = ALLOWED_IMAGE_EXTS | ALLOWED_VIDEO_EXTS | ALLOWED_DOC_EXTS

DANGEROUS_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".bash", ".bin", ".py", ".rb", ".php",
    ".pl", ".js", ".vbs", ".msi", ".jar", ".ps1", ".scr", ".com", ".pif",
    ".dll", ".so", ".dmg", ".app", ".iso", ".apk"
}


def validate_portfolio_upload(upload) -> str:
    """Validate uploaded portfolio media size and format.

    Returns the media_kind ('IMAGE', 'VIDEO', 'DOCUMENT').
    Only images (jpg, png, webp, gif), videos (mp4, mov, webm, mkv),
    and documents (pdf, docx) are accepted.
    """
    import os
    from rest_framework.exceptions import ValidationError as DRFValidationError

    if upload is None or upload.size <= 0:
        raise DRFValidationError({"media": "Uploaded file is empty."})

    ext = os.path.splitext(upload.name or "")[1].lower()
    if not ext:
        raise DRFValidationError({"media": "Uploaded file has no extension."})

    if ext in DANGEROUS_EXTENSIONS:
        raise DRFValidationError({"media": "Executable or script files are strictly prohibited."})

    if ext not in ALLOWED_ALL_EXTS:
        raise DRFValidationError(
            {"media": f"Unsupported file extension '{ext}'. Only images (jpg, png, webp, gif), videos (mp4, mov, webm, mkv), and documents (pdf, docx) are allowed."}
        )

    if ext in ALLOWED_IMAGE_EXTS:
        if upload.size > MAX_PORTFOLIO_IMAGE_BYTES:
            raise DRFValidationError(
                {"media": f"Images must not exceed {MAX_PORTFOLIO_IMAGE_BYTES // (1024 * 1024)}MB."}
            )
        return "IMAGE"

    if ext in ALLOWED_VIDEO_EXTS:
        if upload.size > MAX_PORTFOLIO_VIDEO_BYTES:
            raise DRFValidationError(
                {"media": f"Videos must not exceed {MAX_PORTFOLIO_VIDEO_BYTES // (1024 * 1024)}MB."}
            )
        return "VIDEO"

    if ext in ALLOWED_DOC_EXTS:
        if upload.size > MAX_PORTFOLIO_DOC_BYTES:
            raise DRFValidationError(
                {"media": f"Documents must not exceed {MAX_PORTFOLIO_DOC_BYTES // (1024 * 1024)}MB."}
            )
        return "DOCUMENT"

    raise DRFValidationError({"media": f"Unsupported file extension '{ext}'."})


def validate_chat_attachment(upload) -> None:
    """Validate chat message attachment size and format.

    Only images (jpg, png, webp, gif), videos (mp4, mov, webm, mkv),
    and documents (pdf, docx) are allowed.
    """
    import os
    from rest_framework.exceptions import ValidationError as DRFValidationError

    if upload is None or upload.size <= 0:
        raise DRFValidationError({"attachment": "Uploaded attachment is empty."})

    ext = os.path.splitext(upload.name or "")[1].lower()
    if not ext:
        raise DRFValidationError({"attachment": "Uploaded attachment has no extension."})

    if ext in DANGEROUS_EXTENSIONS:
        raise DRFValidationError({"attachment": "Executable or script attachments are prohibited."})

    if ext not in ALLOWED_ALL_EXTS:
        raise DRFValidationError(
            {"attachment": f"File extension '{ext}' not allowed. Only images (jpg, png, webp, gif), videos (mp4, mov, webm, mkv), and documents (pdf, docx) are allowed."}
        )

    if upload.size > MAX_CHAT_ATTACHMENT_BYTES:
        raise DRFValidationError(
            {"attachment": f"Attachment must not exceed {MAX_CHAT_ATTACHMENT_BYTES // (1024 * 1024)}MB."}
        )

