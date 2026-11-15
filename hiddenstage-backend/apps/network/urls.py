from django.urls import path

from apps.network import views

app_name = "network"

urlpatterns = [
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
    path("assignments/availability/", views.AvailabilityView.as_view(), name="availability"),
    path("assignments/", views.AssignmentListCreateView.as_view(), name="assignments"),
    path("assignments/<uuid:pk>/", views.AssignmentDetailView.as_view(), name="assignment-detail"),
    path(
        "assignments/<uuid:pk>/<str:action>/",
        views.AssignmentActionView.as_view(),
        name="assignment-action",
    ),
]
