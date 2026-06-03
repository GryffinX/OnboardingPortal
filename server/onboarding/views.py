import json
import re

from django.conf import settings
from django.core.mail import EmailMessage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods


PERSONAL_EMAIL_REGEX = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
OFFICIAL_EMAIL_USER_REGEX = r"^[a-zA-Z0-9._]+$"


def validate_payload(payload):
    errors = {}

    name = (payload.get("name") or "").strip()
    personal_email = (payload.get("personalEmail") or "").strip()
    official_email_user = (payload.get("officialEmailUser") or "").strip()
    department = (payload.get("department") or "").strip()
    line_manager = (payload.get("lineManager") or "").strip()
    hod = (payload.get("hod") or "").strip()

    if not name:
        errors["name"] = "Employee name is required."

    if not personal_email or not re.match(PERSONAL_EMAIL_REGEX, personal_email):
        errors["personalEmail"] = "Enter a valid personal email address."

    if not official_email_user or not re.match(OFFICIAL_EMAIL_USER_REGEX, official_email_user):
        errors["officialEmail"] = "Enter a valid official email username."

    if not department:
        errors["department"] = "Select a line department."

    if not line_manager:
        errors["lineManager"] = "Select a line manager."

    if not hod:
        errors["hod"] = "Select an HOD."

    return errors


def build_message(payload):
    official_email = f"{payload['officialEmailUser'].strip()}{settings.OFFICIAL_DOMAIN}"
    recipient = settings.TEST_RECIPIENT

    message = EmailMessage(
        subject=f"A new Onboarding Form Submitted on the Portal",
        body="\n".join(
            [
                "A new onboarding form has been submitted successfully. You are requested to review the same.",
                "",
                f"Employee Name: {payload['name'].strip()}",
                f"Entered Personal Email: {payload['personalEmail'].strip()}",
                f"Proposed Official Email: {official_email}",
                f"Department: {payload['department'].strip()}",
                f"Line Manager: {payload['lineManager'].strip()}",
                f"HOD: {payload['hod'].strip()}",
            ]
        ),
        from_email=settings.EMAIL_HOST_USER,
        to=[recipient],
    )

    return message, official_email


def health_check(request):
    return JsonResponse({"status": "ok"})


@csrf_exempt
@require_http_methods(["POST"])
def onboarding_email(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    errors = validate_payload(payload)

    if errors:
        return JsonResponse(
            {"message": "Please correct the form errors.", "errors": errors},
            status=400,
        )

    if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
        return JsonResponse(
            {
                "message": (
                    "Missing GMAIL_SENDER or GMAIL_APP_PASSWORD environment variables. "
                    "Set them in server/.env or server/.env.example and restart the server."
                )
            },
            status=500,
        )

    try:
        message, official_email = build_message(payload)
        message.send(fail_silently=False)
    except Exception as exc:
        error_message = "Unable to send mail right now."

        if settings.DEBUG:
            error_message = f"Unable to send mail right now: {exc}"

        return JsonResponse({"message": error_message}, status=500)

    return JsonResponse(
        {
            "message": "Mail sent successfully",
            "officialEmail": official_email,
            "recipient": settings.TEST_RECIPIENT,
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def forgot_password(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    email = (payload.get("email") or "").strip()
    if not email or not re.match(PERSONAL_EMAIL_REGEX, email):
        return JsonResponse({"message": "Enter a valid email address."}, status=400)

    if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
        return JsonResponse(
            {"message": "Email settings not configured."},
            status=500,
        )

    try:
        message = EmailMessage(
            subject="Password Reset Request",
            body=(
                f"You requested a password reset for your account associated with {email}.\n\n"
                f"The hardcoded credentials for this portal are:\n"
                f"Email: admin@example.com\n"
                f"Password: admin123\n\n"
                f"Please use these credentials to login."
            ),
            from_email=settings.EMAIL_HOST_USER,
            to=[settings.TEST_RECIPIENT],  
        )
        message.send(fail_silently=False)
    except Exception as exc:
        error_message = "Unable to send mail right now."
        if settings.DEBUG:
            error_message = f"Unable to send mail right now: {exc}"
        return JsonResponse({"message": error_message}, status=500)

    return JsonResponse({"message": "Password reset email sent successfully."})
