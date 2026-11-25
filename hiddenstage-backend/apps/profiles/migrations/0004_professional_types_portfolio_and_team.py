"""Professional participation types, portfolio and scoped team permissions.

Backward compatibility:
- Existing provider rows keep their stored kind. ``WORKER`` stays a valid value, so
  no historical Worker is reclassified automatically (see
  docs/PROFESSIONAL_IDENTITY_ARCHITECTURE.md). The same is true for managers.
- ProviderKind gains four values; the check constraint is replaced, never removed.
- New tables are additive. No existing column is dropped.
"""

import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def seed_other_category(apps, schema_editor):
    ServiceCategory = apps.get_model("profiles", "ServiceCategory")
    ServiceCategory.objects.get_or_create(
        code="other",
        defaults={
            "name": "Other",
            "description": "A service that is not listed. Describe it on the request.",
            "sort_order": 99,
            "is_active": True,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0003_providerprofile_kind_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="providerprofile",
            name="kind",
            field=models.CharField(
                choices=[
                    ("MANAGER", "Event manager"),
                    ("INDIVIDUAL_SERVICE_PROVIDER", "Individual service provider"),
                    ("ASSOCIATED_SERVICE_PROVIDER", "Associated service provider"),
                    ("TALENT", "Talent"),
                    ("WORKER", "Event worker"),
                ],
                default="MANAGER",
                max_length=30,
            ),
        ),
        migrations.RemoveConstraint(
            model_name="providerprofile",
            name="provider_kind_valid",
        ),
        migrations.AddConstraint(
            model_name="providerprofile",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    kind__in=[
                        "MANAGER",
                        "INDIVIDUAL_SERVICE_PROVIDER",
                        "ASSOCIATED_SERVICE_PROVIDER",
                        "TALENT",
                        "WORKER",
                    ]
                ),
                name="provider_kind_valid",
            ),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="username",
            field=models.SlugField(blank=True, max_length=60, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="headline",
            field=models.CharField(blank=True, max_length=160),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="primary_category",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="primary_for_profiles",
                to="profiles.servicecategory",
            ),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="talent_category",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="specializations",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="performance_styles",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="experience_summary",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="languages",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="website",
            field=models.URLField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="instagram",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="youtube",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="availability_note",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="logo",
            field=models.FileField(blank=True, upload_to="providers/logos/"),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="cover_image",
            field=models.FileField(blank=True, upload_to="providers/covers/"),
        ),
        migrations.AddField(
            model_name="providerprofile",
            name="is_public",
            field=models.BooleanField(default=True),
        ),
        migrations.CreateModel(
            name="PortfolioItem",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("title", models.CharField(max_length=150)),
                ("description", models.TextField(blank=True)),
                ("category", models.CharField(blank=True, max_length=80)),
                ("event_date", models.DateField(blank=True, null=True)),
                (
                    "media",
                    models.FileField(blank=True, upload_to="portfolio/items/"),
                ),
                ("external_url", models.URLField(blank=True, max_length=500)),
                (
                    "media_kind",
                    models.CharField(
                        choices=[
                            ("IMAGE", "Image"),
                            ("VIDEO", "Video"),
                            ("DOCUMENT", "Document"),
                            ("LINK", "External link"),
                        ],
                        default="IMAGE",
                        max_length=20,
                    ),
                ),
                (
                    "visibility",
                    models.CharField(
                        choices=[("PUBLIC", "Public"), ("PRIVATE", "Private")],
                        default="PRIVATE",
                        max_length=20,
                    ),
                ),
                ("position", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="portfolio_items",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "provider",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="portfolio_items",
                        to="profiles.providerprofile",
                    ),
                ),
            ],
            options={
                "ordering": ["position", "-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="portfolioitem",
            index=models.Index(
                fields=["owner", "visibility"], name="portfolio_owner_visibility_idx"
            ),
        ),
        migrations.AddConstraint(
            model_name="portfolioitem",
            constraint=models.CheckConstraint(
                condition=models.Q(visibility__in=["PUBLIC", "PRIVATE"]),
                name="portfolio_visibility_valid",
            ),
        ),
        migrations.AddConstraint(
            model_name="portfolioitem",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    media_kind__in=["IMAGE", "VIDEO", "DOCUMENT", "LINK"]
                ),
                name="portfolio_media_kind_valid",
            ),
        ),
        migrations.CreateModel(
            name="ProfileTeamMember",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("permissions", models.JSONField(blank=True, default=list)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "member",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="team_memberships",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="team_members",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="profileteammember",
            constraint=models.UniqueConstraint(
                fields=("owner", "member"), name="uniq_profile_team_member"
            ),
        ),
        migrations.AddConstraint(
            model_name="profileteammember",
            constraint=models.CheckConstraint(
                condition=~models.Q(owner=models.F("member")),
                name="profile_team_member_distinct_users",
            ),
        ),
        migrations.RunPython(seed_other_category, migrations.RunPython.noop),
    ]
