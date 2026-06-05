from django.urls import path

from .views import auth, users, onboarding, common


urlpatterns = [
    path("health", common.health_check, name="health-check"),
    path("onboarding-email", onboarding.onboarding_email, name="onboarding-email"),
    path("forgot-password", auth.forgot_password, name="forgot-password"),
    path("verify-otp", auth.verify_otp, name="verify-otp"),
    path("reset-password", auth.reset_password, name="reset-password"),
    path("login", auth.login_view, name="login"),
    path("create-user", users.create_user, name="create-user"),
    path("update-user", users.update_user, name="update-user"),
    path("users", users.get_users, name="get-users"),
    path("departments", common.get_departments, name="get-departments"),
    path("finalize-onboarding", onboarding.finalize_onboarding, name="finalize-onboarding"),
]
