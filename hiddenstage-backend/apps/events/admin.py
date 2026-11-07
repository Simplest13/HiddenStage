from django.contrib import admin

from apps.events.models import Event, EventAttachment, ServiceRequirement


class ServiceRequirementInline(admin.TabularInline):
    model = ServiceRequirement
    extra = 0


class EventAttachmentInline(admin.TabularInline):
    model = EventAttachment
    extra = 0
    readonly_fields = ("original_name", "content_type", "size_bytes", "scan_status")


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("name", "customer", "event_date", "city", "status", "created_at")
    list_filter = ("status", "event_type", "city")
    search_fields = ("name", "customer__email", "pin_code", "city")
    readonly_fields = ("id", "submitted_at", "withdrawn_at", "closed_at", "created_at", "updated_at")
    inlines = [ServiceRequirementInline, EventAttachmentInline]
