from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import Notification, User, UserRole, normalize_email_address
from apps.accounts.policy import verification_required
from apps.core.validators import (
    normalize_phone,
    normalize_text,
    normalize_username,
    validate_indian_mobile,
    validate_username,
)


class UserSerializer(serializers.ModelSerializer):
    email_verified = serializers.BooleanField(read_only=True)
    profile_completed = serializers.BooleanField(read_only=True)
    # Deployment policy, not per-account state: the SPA cannot choose between the
    # verify screen and the workspace unless it knows whether an unverified
    # account is actually barred.
    email_verification_required = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "full_name",
            "phone",
            "role",
            "avatar",
            "avatar_url",
            "theme_preference",
            "is_staff",
            "is_superuser",
            "email_verified",
            "email_verified_at",
            "email_verification_required",
            "profile_completed",
            "terms_accepted_at",
            "date_joined",
        ]
        read_only_fields = fields

    def get_email_verification_required(self, obj) -> bool:
        return verification_required()

    def get_avatar_url(self, obj) -> str | None:
        if obj.avatar and hasattr(obj.avatar, "url"):
            return obj.avatar.url
        return None


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    username = serializers.CharField(max_length=50, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=UserRole.choices, required=False, default=UserRole.CUSTOMER
    )
    accept_terms = serializers.BooleanField()

    def validate_username(self, value):
        if not value:
            return None
        norm = normalize_username(value)
        try:
            validate_username(norm)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        if User.objects.filter(username__iexact=norm).exists():
            raise serializers.ValidationError("This username is already taken.")
        return norm

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
            username=validated_data.get("username") or None,
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            phone=validated_data.get("phone", ""),
            role=validated_data.get("role", UserRole.CUSTOMER),
            terms_accepted_at=timezone.now(),
        )


class AccountSettingsSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(max_length=254, required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    username = serializers.CharField(max_length=50, required=False, allow_blank=True)
    theme_preference = serializers.ChoiceField(
        choices=["light", "dark", "system", "LIGHT", "DARK", "SYSTEM"], required=False
    )

    def validate_email(self, value):
        user = self.context.get("request").user
        email = normalize_email_address(value)
        if User.objects.filter(email=email).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("This email address is already in use by another account.")
        return email

    def validate_username(self, value):
        if not value:
            return None
        user = self.context.get("request").user
        norm = normalize_username(value)
        try:
            validate_username(norm)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        if User.objects.filter(username__iexact=norm).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("This username is already taken.")
        return norm

    def validate_phone(self, value):
        if not value:
            return ""
        try:
            validate_indian_mobile(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return normalize_phone(value)

    def update(self, instance, validated_data):
        if "full_name" in validated_data:
            instance.full_name = normalize_text(validated_data["full_name"])
        if "email" in validated_data:
            instance.email = validated_data["email"]
        if "phone" in validated_data:
            instance.phone = validated_data["phone"]
        if "username" in validated_data:
            instance.username = validated_data["username"]
        if "theme_preference" in validated_data:
            instance.theme_preference = validated_data["theme_preference"]
        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate_current_password(self, value):
        user = self.context.get("request").user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is not correct.")
        return value

    def validate_new_password(self, value):
        user = self.context.get("request").user
        try:
            password_validation.validate_password(value, user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "event",
            "title",
            "message",
            "notification_type",
            "action_url",
            "is_read",
            "created_at",
        ]
        read_only_fields = fields


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
