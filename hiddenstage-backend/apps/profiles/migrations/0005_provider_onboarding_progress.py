from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0004_portfolioitem_profileteammember_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="providerprofile",
            name="onboarding_completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="onboarding_step",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="role_data",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.RunPython(
            code=lambda apps, schema_editor: _backfill_completed(
                apps.get_model("profiles", "ProviderProfile")
            ),
            reverse_code=migrations.RunPython.noop,
        ),
    ]


def _backfill_completed(ProviderProfile):
    for profile in ProviderProfile.objects.filter(completed_at__isnull=False, onboarding_completed_at__isnull=True):
        profile.onboarding_completed_at = profile.completed_at
        profile.onboarding_step = 4
        profile.save(update_fields=["onboarding_completed_at", "onboarding_step"])
