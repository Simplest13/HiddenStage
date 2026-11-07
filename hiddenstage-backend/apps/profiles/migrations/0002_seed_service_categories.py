"""Seed the service taxonomy that the frontend discovery catalogue already uses.

Codes and names mirror `hiddenstage-frontend/src/features/discovery/data/catalog.ts`
so category slugs are identical on both sides of the API.
"""

from django.db import migrations

CATEGORIES = [
    ("spaces", "Spaces", "Places with room for everyone and everything you have in mind."),
    ("food-and-drink", "Food & drink", "Thoughtful menus, drinks, and service for the table."),
    ("music-and-performance", "Music & performance", "A sound or performance that gives the day its rhythm."),
    ("photography", "Photography", "A considered eye for the moments you want to keep."),
    ("videography", "Videography", "Moving images to help revisit the day."),
    ("decor-and-styling", "Decor & styling", "A setting shaped around your occasion and point of view."),
    ("dj-and-sound", "DJ & sound", "Sound and music shaped around the gathering."),
    ("event-hosting", "Event hosting", "A host to guide guests through the occasion."),
    ("planning", "Planning", "A steady hand to bring the many details together."),
]


def seed_categories(apps, schema_editor):
    ServiceCategory = apps.get_model("profiles", "ServiceCategory")
    for order, (code, name, description) in enumerate(CATEGORIES):
        ServiceCategory.objects.update_or_create(
            code=code,
            defaults={
                "name": name,
                "description": description,
                "sort_order": order,
                "is_active": True,
            },
        )


def unseed_categories(apps, schema_editor):
    ServiceCategory = apps.get_model("profiles", "ServiceCategory")
    ServiceCategory.objects.filter(code__in=[code for code, _, _ in CATEGORIES]).delete()


class Migration(migrations.Migration):
    dependencies = [("profiles", "0001_initial")]

    operations = [migrations.RunPython(seed_categories, unseed_categories)]
