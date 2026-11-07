"""Normalization and validation for Indian address data and phone numbers.

D-012 requires matching normalized PIN codes and localities with city/state
context. Normalization happens on write so equality comparisons in matching are
meaningful, and validation rejects values that cannot be matched safely.
"""

import re

from django.core.exceptions import ValidationError

PIN_CODE_RE = re.compile(r"^[1-9][0-9]{5}$")
INDIAN_MOBILE_RE = re.compile(r"^[6-9][0-9]{9}$")


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
