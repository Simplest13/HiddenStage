from django.urls import path

from apps.invitations import views

app_name = "invitations"

urlpatterns = [
    path(
        "events/<uuid:event_pk>/invitations/",
        views.EventInvitationListCreateView.as_view(),
        name="event-invitations",
    ),
    path(
        "events/<uuid:event_pk>/invitations/<uuid:pk>/withdraw/",
        views.EventInvitationWithdrawView.as_view(),
        name="invitation-withdraw",
    ),
    path(
        "provider/invitations/",
        views.ProviderInvitationListView.as_view(),
        name="provider-invitations",
    ),
    path(
        "provider/invitations/<uuid:pk>/accept/",
        views.ProviderInvitationRespondView.as_view(),
        name="provider-invitation-accept",
    ),
    path(
        "provider/invitations/<uuid:pk>/decline/",
        views.ProviderInvitationDeclineView.as_view(),
        name="provider-invitation-decline",
    ),
]
