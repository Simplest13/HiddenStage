from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import User, UserRole, normalize_email_address
from apps.core.validators import normalize_phone, normalize_text, validate_indian_mobile


class UserSerializer(serializers.ModelSerializer):
    email_verified = serializers.BooleanField(read_only=True)
    profile_completed = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "phone",
            "role",
            "email_verified",
            "email_verified_at",
            "profile_completed",
            "terms_accepted_at",
            "date_joined",
        ]
        read_only_fields = fields


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=UserRole.choices, required=False, default=UserRole.CUSTOMER
    )
    accept_terms = serializers.BooleanField()

    def validate_email(self, value):
        email = normalize_email_address(value)
        if User.objects.filter(email=email).exists():
            # Generic wording: registration must not confirm whether an address is
            # already registered (enumeration protection).
            raise serializers.ValidationError(
                "This email address cannot be registered for a new account."
            )
        return email

    def validate_full_name(self, value):
        name = normalize_text(value)
        if not name:
            raise serializers.ValidationError("Enter your full name.")
        return name

    def validate_phone(self, value):
        if not value:
            return ""
        try:
            validate_indian_mobile(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return normalize_phone(value)

    def validate_accept_terms(self, value):
        if value is not True:
            raise serializers.ValidationError("You must accept the terms to register.")
        return value

    def validate(self, attrs):
        candidate = User(
            email=attrs["email"],
            full_name=attrs["full_name"],
            phone=attrs.get("phone", ""),
        )
        try:
            password_validation.validate_password(attrs["password"], candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        validated_data.pop("accept_terms", None)
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            phone=validated_data.get("phone", ""),
            role=validated_data.get("role", UserRole.CUSTOMER),
            terms_accepted_at=timezone.now(),
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate_email(self, value):
        return normalize_email_address(value)


class EmailOnlySerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)

    def validate_email(self, value):
        return normalize_email_address(value)


class TokenSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=200, trim_whitespace=True)


class PasswordResetConfirmSerializer(TokenSerializer):
    new_password = serializers.CharField(
        write_only=True, trim_whitespace=False, max_length=128
    )

    def validate_new_password(self, value):
        try:
            password_validation.validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value
