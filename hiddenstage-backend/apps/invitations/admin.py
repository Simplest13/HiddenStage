from django.contrib import admin

from apps.invitations.models import Invitation


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ("event", "provider", "status", "expires_at", "created_at")
    list_filter = ("status",)
    search_fields = ("event__name", "provider__email")
    readonly_fields = ("id", "created_at", "updated_at", "responded_at")
