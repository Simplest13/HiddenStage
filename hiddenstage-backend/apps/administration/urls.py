from django.urls import path

from apps.administration import views

app_name = "administration"

urlpatterns = [
    path("overview/", views.AdminOverviewView.as_view(), name="overview"),
    path("users/", views.AdminUserListView.as_view(), name="users"),
    path("users/<uuid:pk>/", views.AdminUserDetailView.as_view(), name="user-detail"),
    path("providers/", views.AdminProviderListView.as_view(), name="providers"),
    path(
        "providers/<uuid:pk>/verification/",
        views.AdminProviderVerificationView.as_view(),
        name="provider-verification",
    ),
    path("businesses/", views.AdminBusinessListView.as_view(), name="businesses"),
    path("businesses/<uuid:pk>/", views.AdminBusinessDetailView.as_view(), name="business-detail"),
    path("events/", views.AdminEventListView.as_view(), name="events"),
    path(
        "events/<uuid:pk>/withdraw/",
        views.AdminEventWithdrawView.as_view(),
        name="event-withdraw",
    ),
    path("commitments/", views.AdminCommitmentListView.as_view(), name="commitments"),
    path(
        "commitments/<uuid:pk>/release/",
        views.AdminCommitmentReleaseView.as_view(),
        name="commitment-release",
    ),
    path("categories/", views.AdminCategoryListCreateView.as_view(), name="categories"),
    path("categories/<uuid:pk>/", views.AdminCategoryDetailView.as_view(), name="category-detail"),
    path("audit/", views.AdminAuditListView.as_view(), name="audit"),
]

