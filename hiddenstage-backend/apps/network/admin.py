from django.contrib import admin

from apps.network.models import NetworkAssociation, NetworkInvitation, WorkerAssignment


@admin.register(NetworkInvitation)
class NetworkInvitationAdmin(admin.ModelAdmin):
    list_display = ("id", "manager", "worker", "status", "expires_at", "created_at")
    list_filter = ("status",)
    search_fields = ("manager__email", "worker__email")
    readonly_fields = ("id", "created_at", "updated_at", "responded_at")


@admin.register(NetworkAssociation)
class NetworkAssociationAdmin(admin.ModelAdmin):
    list_display = ("id", "manager", "worker", "status", "associated_at", "ended_at")
    list_filter = ("status",)
    search_fields = ("manager__email", "worker__email")
    readonly_fields = ("id", "associated_at", "ended_at")


@admin.register(WorkerAssignment)
class WorkerAssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "role",
        "manager",
        "worker",
        "status",
        "event_date",
        "compensation_paise",
        "created_at",
    )
    list_filter = ("status", "event_date")
    search_fields = ("role", "manager__email", "worker__email", "location")
    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
        "responded_at",
        "started_at",
        "completed_at",
        "cancelled_at",
    )

