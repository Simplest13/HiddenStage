from django.conf import settings
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0003_providerprofile_kind_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = []
