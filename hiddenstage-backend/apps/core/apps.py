import os
import sys
import threading
import time
from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    label = "core"

    def ready(self):
        non_server_cmds = {"test", "migrate", "makemigrations", "collectstatic", "shell", "check"}
        if any(cmd in sys.argv for cmd in non_server_cmds):
            return
        from django.conf import settings
        if getattr(settings, "KEEP_DB_WARM", True):
            t = threading.Thread(target=self._keep_neon_warm, daemon=True, name="neon-keepalive")
            t.start()

    def _keep_neon_warm(self):
        # Pre-warm the database connection immediately on startup so first user request incurs 0ms connection handshake.
        # Ping every 180 seconds to prevent Neon compute sleep (default 300s).
        while True:
            try:
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1;")
            except Exception:
                pass
            time.sleep(180)
