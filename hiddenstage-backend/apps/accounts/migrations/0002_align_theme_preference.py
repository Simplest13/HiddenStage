from django.db import migrations, models


def align_theme_preference(apps, schema_editor):
    table = "accounts_user"
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute(
            f"""
            ALTER TABLE {table}
            ADD COLUMN IF NOT EXISTS theme_preference varchar(20) NOT NULL DEFAULT 'LIGHT';
            """
        )
        schema_editor.execute(
            f"""
            UPDATE {table}
            SET theme_preference = 'LIGHT'
            WHERE theme_preference IS NULL;
            """
        )
    elif schema_editor.connection.vendor == "sqlite":
        with schema_editor.connection.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) FROM pragma_table_info('accounts_user') "
                "WHERE name = 'theme_preference'"
            )
            exists = cursor.fetchone()[0] > 0
        if not exists:
            schema_editor.execute(
                "ALTER TABLE accounts_user "
                "ADD COLUMN theme_preference varchar(20) "
                "NOT NULL DEFAULT 'LIGHT'"
            )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    align_theme_preference,
                    reverse_code=migrations.RunPython.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="user",
                    name="theme_preference",
                    field=models.CharField(
                        choices=[
                            ("LIGHT", "Light"),
                            ("DARK", "Dark"),
                            ("SYSTEM", "System"),
                        ],
                        default="LIGHT",
                        max_length=20,
                    ),
                ),
            ],
        ),
    ]
