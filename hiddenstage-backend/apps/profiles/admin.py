from django.contrib import admin

from apps.profiles.models import (
    Business,
    BusinessRepresentative,
    CustomerProfile,
    ProviderCoverage,
    ProviderProfile,
    ProviderService,
    ServiceCategory,
)


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "sort_order", "is_active")
    list_editable = ("is_active", "sort_order")
    prepopulated_fields = {"code": ("name",)}
    search_fields = ("name", "code")


class ProviderCoverageInline(admin.TabularInline):
    model = ProviderCoverage
    extra = 0


class ProviderServiceInline(admin.TabularInline):
    model = ProviderService
    extra = 0


@admin.register(ProviderProfile)
class ProviderProfileAdmin(admin.ModelAdmin):
    list_display = ("display_name", "user", "kind", "verification_status", "completed_at")
    list_filter = ("verification_status", "kind")
    search_fields = ("display_name", "user__email", "business__name")
    actions = ["mark_verified", "mark_rejected"]
    inlines = [ProviderServiceInline, ProviderCoverageInline]

    @admin.action(description="Mark selected providers as Verified")
    def mark_verified(self, request, queryset):
        queryset.update(verification_status="VERIFIED")

    @admin.action(description="Mark selected providers as Rejected")
    def mark_rejected(self, request, queryset):
        queryset.update(verification_status="REJECTED")


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "city", "locality", "pin_code", "completed_at")
    search_fields = ("user__email", "city", "pin_code")


class BusinessRepresentativeInline(admin.TabularInline):
    model = BusinessRepresentative
    extra = 0


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "is_active")
    search_fields = ("name",)
    inlines = [BusinessRepresentativeInline]
