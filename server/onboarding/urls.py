from django.urls import path

from .views import auth, users, onboarding, common, requests


urlpatterns = [
    path("health", common.health_check, name="health-check"),
    path("onboarding-email", onboarding.onboarding_email, name="onboarding-email"),
    path("workflow-options", common.get_workflow_options, name="workflow-options"),
    path("software-catalog", common.get_software_catalog, name="software-catalog"),
    path("create-software-item", common.create_software_item, name="create-software-item"),
    path("update-software-item", common.update_software_item, name="update-software-item"),
    path("delete-software-item", common.delete_software_item, name="delete-software-item"),
    path("forgot-password", auth.forgot_password, name="forgot-password"),
    path("verify-otp", auth.verify_otp, name="verify-otp"),
    path("reset-password", auth.reset_password, name="reset-password"),
    path("login", auth.login_view, name="login"),
    path("create-user", users.create_user, name="create-user"),
    path("update-user", users.update_user, name="update-user"),
    path("bulk-update-users-status", users.bulk_update_users_status, name="bulk-update-users-status"),
    path("request-profile-update-otp", users.request_profile_update_otp, name="request-profile-update-otp"),
    path("verify-profile-update", users.verify_profile_update, name="verify-profile-update"),
    path("delete-user", users.delete_user, name="delete-user"),
    path("users", users.get_users, name="get-users"),
    path("departments", common.get_departments, name="get-departments"),
    path("create-department", users.create_department, name="create-department"),
    path("update-department", common.update_department, name="update-department"),
    path("delete-department", common.delete_department, name="delete-department"),
    path("changelogs", requests.get_changelogs, name="get-changelogs"),
    path("finalize-onboarding", onboarding.finalize_onboarding, name="finalize-onboarding"),
    path("requests", requests.get_requests, name="get-requests"),
    path("save-request", requests.save_request, name="save-request"),
    path("acknowledge-laptop", requests.acknowledge_laptop, name="acknowledge-laptop"),
    path("assets", requests.get_assets, name="get-assets"),
    path("create-asset", requests.create_asset, name="create-asset"),
    path("update-asset", requests.update_asset, name="update-asset"),
    path("delete-asset", requests.delete_asset, name="delete-asset"),
    path("delete-request", requests.delete_request, name="delete-request"),
]
