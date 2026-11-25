"""A network invitation may be sent by a Manager or requested by a professional.

Existing rows default to MANAGER_INVITES, which is exactly what they were: the
Manager created them. No row is deleted or reassigned.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("network", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="networkinvitation",
            name="initiated_by",
            field=models.CharField(
                choices=[
                    ("MANAGER_INVITES", "Manager invited the professional"),
                    ("PROFESSIONAL_REQUESTS", "Professional requested association"),
                ],
                default="MANAGER_INVITES",
                max_length=24,
            ),
        ),
        migrations.AddConstraint(
            model_name="networkinvitation",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    initiated_by__in=["MANAGER_INVITES", "PROFESSIONAL_REQUESTS"]
                ),
                name="network_invitation_direction_valid",
            ),
        ),
    ]
