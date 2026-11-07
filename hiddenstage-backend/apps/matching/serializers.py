from rest_framework import serializers

from apps.profiles.serializers import ProviderCoverageSerializer


class ProviderMatchSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    display_name = serializers.CharField()
    description = serializers.CharField()
    verification_status = serializers.CharField()
    categories = serializers.ListField(child=serializers.CharField())
    matching_coverage = ProviderCoverageSerializer(many=True)
    exact_pin_match = serializers.BooleanField()
    already_invited = serializers.BooleanField()


class ProviderDetailSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    display_name = serializers.CharField()
    description = serializers.CharField()
    contact = serializers.CharField()
    verification_status = serializers.CharField()
    categories = serializers.ListField(child=serializers.CharField())
    coverage = ProviderCoverageSerializer(many=True)


class DiscoveryQuerySerializer(serializers.Serializer):
    category = serializers.SlugField(required=False, allow_blank=True)
    pin_code = serializers.CharField(required=False, allow_blank=True, max_length=10)
    city = serializers.CharField(required=False, allow_blank=True, max_length=80)
    state = serializers.CharField(required=False, allow_blank=True, max_length=80)
