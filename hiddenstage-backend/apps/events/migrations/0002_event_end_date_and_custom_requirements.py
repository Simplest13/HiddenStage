"""Multi-day events and event-specific custom service requirements.

Data preservation:
- Every existing event already has one date. `end_date` is backfilled from it, so a
  historical event reads as a one-day event with exactly the date it had.
- No row is deleted and no requirement category is rewritten: a custom requirement
  stores its text beside the existing ``other`` category.
"""

from django.db import migrations, models


def backfill_end_date(apps, schema_editor):
    Event = apps.get_model("events", "Event")
    Event.objects.filter(end_date__isnull=True).update(end_date=models.F("event_date"))


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="end_date",
            field=models.DateField(null=True),
        ),
        migrations.AddField(
            model_name="event",
            name="schedule_notes",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="servicerequirement",
            name="custom_service_name",
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name="servicerequirement",
            name="custom_service_description",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="servicerequirement",
            name="custom_review_status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending review"),
                    ("APPROVED", "Approved"),
                    ("REJECTED", "Rejected"),
                    ("NOT_REQUIRED", "Predefined category"),
                ],
                default="NOT_REQUIRED",
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_end_date, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="event",
            name="end_date",
            field=models.DateField(),
        ),
        migrations.AddConstraint(
            model_name="event",
            constraint=models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F("event_date")),
                name="event_end_date_on_or_after_start",
            ),
        ),
        migrations.AddConstraint(
            model_name="servicerequirement",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    custom_review_status__in=[
                        "PENDING",
                        "APPROVED",
                        "REJECTED",
                        "NOT_REQUIRED",
                    ]
                ),
                name="requirement_custom_review_status_valid",
            ),
        ),
    ]
