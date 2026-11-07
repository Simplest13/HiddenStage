from django.urls import path

from apps.events import views

app_name = "events"

urlpatterns = [
    path("events/", views.EventListCreateView.as_view(), name="event-list"),
    path("events/<uuid:pk>/", views.EventDetailView.as_view(), name="event-detail"),
    path("events/<uuid:pk>/submit/", views.EventSubmitView.as_view(), name="event-submit"),
    path("events/<uuid:pk>/withdraw/", views.EventWithdrawView.as_view(), name="event-withdraw"),
    path(
        "events/<uuid:event_pk>/requirements/",
        views.RequirementListCreateView.as_view(),
        name="requirement-list",
    ),
    path(
        "events/<uuid:event_pk>/requirements/<uuid:pk>/",
        views.RequirementDetailView.as_view(),
        name="requirement-detail",
    ),
    path(
        "events/<uuid:event_pk>/attachments/",
        views.EventAttachmentListCreateView.as_view(),
        name="attachment-list",
    ),
    path(
        "events/<uuid:event_pk>/attachments/<uuid:pk>/download/",
        views.EventAttachmentDownloadView.as_view(),
        name="attachment-download",
    ),
    path(
        "events/<uuid:event_pk>/attachments/<uuid:pk>/",
        views.EventAttachmentDeleteView.as_view(),
        name="attachment-delete",
    ),
]
