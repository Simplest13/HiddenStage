from django.contrib import admin

from apps.administration.models import AdminAuditLog


@admin.register(AdminAuditLog)
class AdminAuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "actor", "target_type", "target_label")
    list_filter = ("action", "target_type")
    search_fields = ("target_label", "target_id", "note", "actor__email")
    readonly_fields = (
        "id",
        "actor",
        "action",
        "target_type",
        "target_id",
        "target_label",
        "note",
        "metadata",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

