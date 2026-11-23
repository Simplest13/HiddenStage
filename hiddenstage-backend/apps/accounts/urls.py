from django.urls import path

from apps.accounts import views

app_name = "accounts"

urlpatterns = [
    path("csrf/", views.CsrfTokenView.as_view(), name="csrf"),
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("me/", views.MeView.as_view(), name="me"),
    path("email/verify/", views.EmailVerifyView.as_view(), name="email-verify"),
    path("email/resend/", views.EmailResendView.as_view(), name="email-resend"),
    path("password/reset/", views.PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "password/reset/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    path("check-username/", views.CheckUsernameView.as_view(), name="check-username"),
    path("settings/", views.AccountSettingsView.as_view(), name="settings"),
    path("password/change/", views.ChangePasswordView.as_view(), name="password-change"),
    path("avatar/", views.AvatarUploadView.as_view(), name="avatar"),
    path("avatars/<str:filename>", views.AvatarMediaView.as_view(), name="avatar-media"),
    path("notifications/", views.NotificationListView.as_view(), name="notifications"),
    path("notifications/mark-read/", views.MarkNotificationsReadView.as_view(), name="notifications-mark-read"),
]
