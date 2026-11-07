from django.contrib import admin

from apps.commitments.models import Commitment, CommitmentAudit, CommitmentLine


class CommitmentLineInline(admin.TabularInline):
    model = CommitmentLine
    extra = 0
    readonly_fields = ("revision_item", "requirement", "package_key", "title", "amount_paise")
    can_delete = False


class CommitmentAuditInline(admin.TabularInline):
    model = CommitmentAudit
    extra = 0
    readonly_fields = ("action", "actor", "note", "created_at")
    can_delete = False


@admin.register(Commitment)
class CommitmentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "event",
        "customer",
        "provider",
        "status",
        "total_paise",
        "accepted_at",
    )
    list_filter = ("status",)
    search_fields = ("event__name", "customer__email", "provider__email")
    readonly_fields = ("accepted_at", "released_at", "released_by", "total_paise")
    inlines = [CommitmentLineInline, CommitmentAuditInline]
