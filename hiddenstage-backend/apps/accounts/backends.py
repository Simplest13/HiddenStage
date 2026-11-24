from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

from apps.accounts.models import normalize_email_address


class EmailBackend(ModelBackend):
    """Authenticate by email, ignoring case and surrounding whitespace."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        email = kwargs.get("email") or username
        if email is None or password is None:
            return None
        try:
            user = UserModel.objects.get(email=normalize_email_address(email))
        except UserModel.DoesNotExist:
            # Run the default hasher once so response timing does not reveal
            # whether the account exists.
            UserModel().set_password(password)
            return None
        if (user.check_password(password) or user.check_password(password.strip())) and self.user_can_authenticate(user):
            return user
        return None

    def get_user(self, user_id):
        if not user_id:
            return None
        from django.core.cache import cache
        cache_key = f"auth_user:{user_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        UserModel = get_user_model()
        try:
            user = (
                UserModel.objects.select_related("customer_profile", "provider_profile")
                .get(pk=user_id)
            )
            cache.set(cache_key, user, timeout=60)
            return user
        except UserModel.DoesNotExist:
            return None
