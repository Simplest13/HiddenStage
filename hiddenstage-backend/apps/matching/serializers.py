from rest_framework import serializers

from apps.profiles.serializers import (
    PortfolioItemSerializer,
    ProviderCoverageSerializer,
    ProviderServiceSerializer,
)


class ProviderMatchSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    user_id = serializers.UUIDField()
    display_name = serializers.CharField()
    kind = serializers.CharField()
    description = serializers.CharField()
    verification_status = serializers.CharField()
    categories = serializers.ListField(child=serializers.CharField())
    matching_coverage = ProviderCoverageSerializer(many=True)
    exact_pin_match = serializers.BooleanField()
    already_invited = serializers.BooleanField()


class ProviderDetailSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    display_name = serializers.CharField()
    username = serializers.CharField(allow_null=True, required=False)
    headline = serializers.CharField(allow_null=True, required=False)
    kind = serializers.CharField()
    description = serializers.CharField()
    contact = serializers.CharField()
    verification_status = serializers.CharField()
    categories = serializers.ListField(child=serializers.CharField())
    coverage = ProviderCoverageSerializer(many=True)
    primary_category = serializers.CharField(allow_null=True, required=False)
    primary_category_name = serializers.CharField(allow_null=True, required=False)
    talent_category = serializers.CharField(allow_null=True, required=False)
    specializations = serializers.ListField(child=serializers.CharField(), required=False)
    performance_styles = serializers.ListField(child=serializers.CharField(), required=False)
    experience_summary = serializers.CharField(allow_null=True, required=False)
    languages = serializers.ListField(child=serializers.CharField(), required=False)
    website = serializers.CharField(allow_null=True, required=False)
    instagram = serializers.CharField(allow_null=True, required=False)
    youtube = serializers.CharField(allow_null=True, required=False)
    availability_note = serializers.CharField(allow_null=True, required=False)
    logo = serializers.CharField(allow_null=True, required=False)
    cover_image = serializers.CharField(allow_null=True, required=False)
    is_public = serializers.BooleanField(required=False)
    completed_at = serializers.DateTimeField(allow_null=True, required=False)
    services = ProviderServiceSerializer(many=True, required=False)
    portfolio = PortfolioItemSerializer(many=True, required=False)
    portfolio_items = PortfolioItemSerializer(many=True, required=False)
    team_members = serializers.ListField(child=serializers.CharField(), required=False)
    rating = serializers.FloatField(allow_null=True, required=False)
    review_count = serializers.IntegerField(required=False)


class PublicDirectoryProviderSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    display_name = serializers.CharField()
    username = serializers.CharField(allow_null=True, required=False)
    headline = serializers.CharField(allow_null=True, required=False)
    kind = serializers.CharField()
    description = serializers.CharField()
    verification_status = serializers.CharField()
    categories = serializers.ListField(child=serializers.CharField())
    primary_category = serializers.CharField(allow_null=True, required=False)
    logo = serializers.CharField(allow_null=True, required=False)
    cover_image = serializers.CharField(allow_null=True, required=False)
    city = serializers.CharField(allow_null=True, required=False)
    state = serializers.CharField(allow_null=True, required=False)
    locality = serializers.CharField(allow_null=True, required=False)
    pin_code = serializers.CharField(allow_null=True, required=False)
    starting_price_paise = serializers.IntegerField(allow_null=True, required=False)
    coverage_count = serializers.IntegerField(default=0)
    coverage_locations = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    coverage_areas = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    rating = serializers.FloatField(allow_null=True, required=False)
    review_count = serializers.IntegerField(default=0)
    is_featured = serializers.BooleanField(default=False)


class OpportunityRequirementSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    category = serializers.CharField()
    category_name = serializers.CharField()
    custom_service_name = serializers.CharField(required=False, allow_blank=True, default="")
    description = serializers.CharField()
    instructions = serializers.CharField()
    budget_paise = serializers.IntegerField(allow_null=True)
    status = serializers.CharField()


class ProviderOpportunitySerializer(serializers.Serializer):
    """A matched public request. Customer identity and exact venue are never included."""

    id = serializers.UUIDField()
    name = serializers.CharField()
    event_type = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True, default="")
    event_date = serializers.DateField()
    end_date = serializers.DateField(required=False, allow_null=True)
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    guest_count = serializers.IntegerField()
    locality = serializers.CharField()
    city = serializers.CharField()
    state = serializers.CharField()
    requirements = OpportunityRequirementSerializer(many=True)
    invitation_status = serializers.CharField(allow_null=True)
    already_quoted = serializers.BooleanField()
    quotation_status = serializers.CharField(allow_null=True)
    latest_revision_status = serializers.CharField(allow_null=True)


class DiscoveryQuerySerializer(serializers.Serializer):
    category = serializers.SlugField(required=False, allow_blank=True)
    pin_code = serializers.CharField(required=False, allow_blank=True, max_length=10)
    city = serializers.CharField(required=False, allow_blank=True, max_length=80)
    state = serializers.CharField(required=False, allow_blank=True, max_length=80)
