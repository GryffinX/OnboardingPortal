from django.urls import path

from . import views


urlpatterns = [
    path("health", views.health_check, name="health-check"),
    path("onboarding-email", views.onboarding_email, name="onboarding-email"),
]
