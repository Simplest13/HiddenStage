from django.db import connection
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Liveness plus a real database round trip."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(responses={200: None}, auth=[], description="Service and database health.")
    def get(self, request):
        database_ok = True
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception:  # pragma: no cover - reported as unhealthy rather than raised
            database_ok = False
        status_code = 200 if database_ok else 503
        return Response(
            {
                "status": "ok" if database_ok else "degraded",
                "database": "ok" if database_ok else "unavailable",
            },
            status=status_code,
        )
