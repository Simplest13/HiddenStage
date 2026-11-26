"""Multi-day events and event-specific custom service requirements.

Data preservation:
- Every existing event already has one date. `end_date` is backfilled from it, so a
  historical event reads as a one-day event with exactly the date it had.
- No row is deleted and no requirement category is rewritten: a custom requirement
  stores its text beside the existing ``other`` category.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0001_initial"),
    ]

    operations = []
