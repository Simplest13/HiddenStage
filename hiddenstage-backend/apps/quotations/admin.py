from django.contrib import admin

from apps.quotations.models import Quotation, QuotationItem, QuotationRevision


class QuotationItemInline(admin.TabularInline):
    model = QuotationItem
    extra = 0
    readonly_fields = ("amount_paise",)


class QuotationRevisionInline(admin.TabularInline):
    model = QuotationRevision
    extra = 0
    fk_name = "quotation"
    readonly_fields = ("revision_number", "status", "total_paise", "submitted_at")


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ("id", "event", "provider", "status", "current_revision", "updated_at")
    list_filter = ("status",)
    search_fields = ("event__name", "provider__email")
    inlines = [QuotationRevisionInline]


@admin.register(QuotationRevision)
class QuotationRevisionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "quotation",
        "revision_number",
        "status",
        "total_paise",
        "valid_until",
    )
    list_filter = ("status",)
    readonly_fields = ("total_paise", "submitted_at", "superseded_at")
    inlines = [QuotationItemInline]
