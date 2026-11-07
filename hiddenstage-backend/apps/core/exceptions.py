"""API error handling.

Errors keep the `{"detail": "..."}` shape the frontend client already reads, and
Django validation errors raised by model/service code become 400 responses instead
of 500s.
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.views import exception_handler


class Conflict(APIException):
    """The request is valid but conflicts with current persisted state."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "This action conflicts with the current state of the record."
    default_code = "conflict"


class BusinessRuleViolation(APIException):
    """A domain rule rejected an otherwise well-formed request."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "This action is not permitted in the current state."
    default_code = "business_rule_violation"


def api_exception_handler(exc, context):
    if isinstance(exc, DjangoValidationError):
        detail = getattr(exc, "message_dict", None)
        if detail is None:
            detail = {"detail": list(exc.messages)}
        exc = ValidationError(detail)
    return exception_handler(exc, context)
