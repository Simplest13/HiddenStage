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
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    def get_user(self, user_id):
        UserModel = get_user_model()
        try:
            return UserModel.objects.get(pk=user_id)
        except UserModel.DoesNotExist:
            return None
