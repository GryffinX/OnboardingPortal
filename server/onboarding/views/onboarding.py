import json
import random
import string
from django.conf import settings
from django.core.mail import EmailMessage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
from ..models import UserProfile, Department
from .utils import validate_payload, build_message


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
def finalize_onboarding(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip()
    department_name = (payload.get("department") or "").strip()

    if not email or not name:
        return JsonResponse({"message": "Name and email are required."}, status=400)

    try:
        # Check if user already exists
        user = User.objects.filter(email=email).first() or User.objects.filter(username=email).first()
        
        default_password = None
        if not user:
            # Create a default password
            default_password = "".join(random.choices(string.ascii_letters + string.digits, k=10))

            # Create user
            first_name = name.split(" ")[0]
            last_name = " ".join(name.split(" ")[1:]) if " " in name else ""

            user = User.objects.create_user(
                username=email,
                email=email,
                password=default_password,
                first_name=first_name,
                last_name=last_name
            )
            
            # Find department
            dept = None
            if department_name:
                dept = Department.objects.filter(name=department_name).first()

            # Create/Update profile
            UserProfile.objects.update_or_create(user=user, defaults={"role": "Employee", "department": dept})

            # Send email only to new users
            try:
                message = EmailMessage(
                    subject="Welcome to the Team! Your Onboarding is Approved",
                    body=(
                        f"Hello {name},\n\n"
                        f"Congratulations! Your onboarding has been fully approved.\n"
                        f"A new user account has been created for you. You can log in using these credentials:\n\n"
                        f"Email: {email}\n"
                        f"Default Password: {default_password}\n\n"
                        f"Please log in and change your password immediately.\n\n"
                        f"Regards,\nOnboarding Team"
                    ),
                    from_email=settings.EMAIL_HOST_USER,
                    to=[email],
                )
                message.send(fail_silently=False)
            except Exception as mail_exc:
                if settings.DEBUG:
                    print(f"Failed to send welcome email: {mail_exc}")
        
        return JsonResponse({
            "message": "User account is active.",
            "password": default_password,
            "created": default_password is not None
        })
    except Exception as exc:
        return JsonResponse({"message": f"Error finalising onboarding: {str(exc)}"}, status=500)
