from django.urls import path

from . import views


urlpatterns = [
    path("health", views.health_check, name="health-check"),
    path("onboarding-email", views.onboarding_email, name="onboarding-email"),
    path("forgot-password", views.forgot_password, name="forgot-password"),
    path("verify-otp", views.verify_otp, name="verify-otp"),
    path("reset-password", views.reset_password, name="reset-password"),
    path("login", views.login_view, name="login"),
    path("create-user", views.create_user, name="create-user"),
    path("update-user", views.update_user, name="update-user"),
    path("users", views.get_users, name="get-users"),
    path("departments", views.get_departments, name="get-departments"),
    path("finalize-onboarding", views.finalize_onboarding, name="finalize-onboarding"),
]
