from django.urls import path

from apps.network import views

app_name = "network"

urlpatterns = [
    path("network/stream/", views.RealtimeStreamView.as_view(), name="realtime-stream"),
    path("network/connections/", views.CustomerNetworkListView.as_view(), name="customer-connections"),
    path("network/connections/connect/", views.CustomerNetworkConnectView.as_view(), name="customer-connect"),
    path("network/connections/<uuid:provider_id>/", views.CustomerNetworkDisconnectView.as_view(), name="customer-disconnect"),
    path("network/search-providers/", views.CustomerNetworkSearchView.as_view(), name="customer-search-providers"),
    path("network/conversations/", views.ConversationListView.as_view(), name="conversations"),
    path("network/conversations/<uuid:pk>/", views.ConversationDetailView.as_view(), name="conversation-detail"),
    path("network/conversations/<uuid:pk>/messages/", views.SendMessageView.as_view(), name="send-message"),
    path("network/workers/", views.WorkerDiscoveryView.as_view(), name="worker-discovery"),
    path(
        "network/workers/<uuid:user_id>/",
        views.WorkerDetailView.as_view(),
        name="worker-detail",
    ),
    path(
        "network/invitations/",
        views.NetworkInvitationListCreateView.as_view(),
        name="network-invitations",
    ),
    path(
        "network/invitations/<uuid:pk>/<str:action>/",
        views.NetworkInvitationActionView.as_view(),
        name="network-invitation-action",
    ),
    path(
        "network/associations/",
        views.NetworkAssociationListView.as_view(),
        name="network-associations",
    ),
    path(
        "network/associations/<uuid:pk>/end/",
        views.NetworkAssociationEndView.as_view(),
        name="network-association-end",
    ),
    path(
        "network/managers/request/",
        views.ManagerAssociationRequestView.as_view(),
        name="manager-association-request",
    ),
    path("assignments/availability/", views.AvailabilityView.as_view(), name="availability"),
    path("assignments/", views.AssignmentListCreateView.as_view(), name="assignments"),
    path("assignments/<uuid:pk>/", views.AssignmentDetailView.as_view(), name="assignment-detail"),
    path(
        "assignments/<uuid:pk>/<str:action>/",
        views.AssignmentActionView.as_view(),
        name="assignment-action",
    ),
]
