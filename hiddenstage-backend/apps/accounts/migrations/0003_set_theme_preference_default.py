from django.db import migrations


def set_theme_preference_default(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(
        """
        ALTER TABLE accounts_user
        ALTER COLUMN theme_preference SET DEFAULT 'LIGHT';
        """
    )
    schema_editor.execute(
        """
        UPDATE accounts_user
        SET theme_preference = 'LIGHT'
        WHERE theme_preference IS NULL;
        """
    )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_align_theme_preference"),
    ]

    operations = [
        migrations.RunPython(
            set_theme_preference_default,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
