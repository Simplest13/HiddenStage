"""Shared model primitives.

Money is stored as integer paise in BIGINT columns (D-006). Every monetary
column is paired with a non-negative check constraint so invalid totals cannot be
persisted by any code path, including raw bulk inserts.
"""

import uuid

from django.core.validators import MinValueValidator
from django.db import models


class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)

    class Meta:
        abstract = True


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


def money_field(**kwargs):
    """A BIGINT paise column. Never a float, never a decimal string."""
    defaults = {
        "validators": [MinValueValidator(0)],
        "help_text": "Amount in integer paise (INR 1 = 100 paise).",
    }
    defaults.update(kwargs)
    return models.BigIntegerField(**defaults)


def non_negative_check(field_name: str, constraint_name: str):
    return models.CheckConstraint(
        condition=models.Q(**{f"{field_name}__gte": 0}), name=constraint_name
    )
