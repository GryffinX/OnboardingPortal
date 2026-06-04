import json
import re
import random
import string
import datetime

from django.conf import settings
from django.core.mail import EmailMessage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import PasswordResetOTP, UserProfile

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


def generate_otp():
    return "".join(random.choices(string.digits, k=6))


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

    otp = generate_otp()
    
    # Store OTP in DB
    PasswordResetOTP.objects.create(email=email, otp=otp)

    try:
        message = EmailMessage(
            subject="Password Reset OTP",
            body=(
                f"Your OTP for password reset is: {otp}\n\n"
                f"This OTP is valid for 10 minutes.\n"
                f"If you did not request this, please ignore this email."
            ),
            from_email=settings.EMAIL_HOST_USER,
            to=[email],
        )
        message.send(fail_silently=False)
    except Exception as exc:
        error_message = "Unable to send mail right now."
        if settings.DEBUG:
            error_message = f"Unable to send mail right now: {exc}"
        return JsonResponse({"message": error_message}, status=500)

    return JsonResponse({"message": "OTP sent successfully to your email."})


@csrf_exempt
@require_http_methods(["POST"])
def verify_otp(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    email = (payload.get("email") or "").strip()
    otp = (payload.get("otp") or "").strip()

    if not email or not otp:
        return JsonResponse({"message": "Email and OTP are required."}, status=400)

    # Find the latest valid OTP for this email
    otp_record = PasswordResetOTP.objects.filter(email=email, otp=otp).order_by("-created_at").first()

    if not otp_record or not otp_record.is_valid():
        return JsonResponse({"message": "Invalid or expired OTP."}, status=400)

    otp_record.is_verified = True
    otp_record.save()

    return JsonResponse({"message": "OTP verified successfully."})


@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    email = (payload.get("email") or "").strip()
    password = (payload.get("password") or "").strip()

    if not email or not password:
        return JsonResponse({"message": "Email and password are required."}, status=400)

    # Try to authenticate with email as username
    user = authenticate(request, username=email, password=password)
    
    if user is None:
        # Try to find user by email and then authenticate
        try:
            user_obj = User.objects.get(email=email)
            user = authenticate(request, username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None

    if user is not None:
        role = "Employee"
        try:
            role = user.profile.role
        except UserProfile.DoesNotExist:
            pass
            
        return JsonResponse({
            "message": "Login successful",
            "user": {
                "name": f"{user.first_name} {user.last_name}".strip() or user.username,
                "email": user.email,
                "role": role
            }
        })
    else:
        return JsonResponse({"message": "Invalid credentials."}, status=401)


@csrf_exempt
@require_http_methods(["POST"])
def create_user(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip()
    role = (payload.get("role") or "Employee").strip()
    password = (payload.get("password") or "").strip()

    if not email or not password or not name:
        return JsonResponse({"message": "Name, email and password are required."}, status=400)

    if User.objects.filter(email=email).exists() or User.objects.filter(username=email).exists():
        return JsonResponse({"message": "User with this email already exists."}, status=400)

    try:
        # Create user
        first_name = name.split(" ")[0]
        last_name = " ".join(name.split(" ")[1:]) if " " in name else ""
        
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        
        # Create profile
        UserProfile.objects.create(user=user, role=role)

        # Send email to the new user
        try:
            message = EmailMessage(
                subject="Welcome to Onboarding Portal - Your Account Details",
                body=(
                    f"Hello {name},\n\n"
                    f"Your account has been created successfully on the Onboarding Portal.\n"
                    f"You can log in using the following credentials:\n\n"
                    f"Login URL: http://localhost:5173/ (or your portal URL)\n"
                    f"Email: {email}\n"
                    f"Password: {password}\n\n"
                    f"Please change your password after your first login using the 'Forgot Password' flow if needed.\n\n"
                    f"Regards,\nAdmin Team"
                ),
                from_email=settings.EMAIL_HOST_USER,
                to=[email],
            )
            message.send(fail_silently=False)
        except Exception as mail_exc:
            # We created the user, but mail failed. Still return success but maybe a warning.
            if settings.DEBUG:
                print(f"Failed to send welcome email: {mail_exc}")

        return JsonResponse({
            "message": "User created successfully. Welcome email sent.",
            "user": {
                "name": name,
                "email": email,
                "role": role
            }
        })
    except Exception as exc:
        return JsonResponse({"message": f"Error creating user: {str(exc)}"}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def get_users(request):
    users = User.objects.all().select_related('profile')
    user_list = []
    for user in users:
        role = "Employee"
        try:
            role = user.profile.role
        except UserProfile.DoesNotExist:
            pass
            
        user_list.append({
            "name": f"{user.first_name} {user.last_name}".strip() or user.username,
            "email": user.email,
            "role": role
        })
    return JsonResponse({"users": user_list})


@csrf_exempt
@require_http_methods(["POST"])
def reset_password(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    email = (payload.get("email") or "").strip()
    otp = (payload.get("otp") or "").strip()
    password = (payload.get("password") or "").strip()

    if not email or not otp or not password:
        return JsonResponse({"message": "Email, OTP and new password are required."}, status=400)

    # Check if OTP was verified
    otp_record = PasswordResetOTP.objects.filter(email=email, otp=otp, is_verified=True).order_by("-created_at").first()

    if not otp_record or not otp_record.is_valid():
        return JsonResponse({"message": "Invalid request. Please verify OTP again."}, status=400)

    # Find user and reset password
    try:
        user = User.objects.get(username=email)
    except User.DoesNotExist:
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({"message": "User not found."}, status=404)

    user.set_password(password)
    user.save()

    # Mark OTP as used/unverifiable
    otp_record.is_verified = False
    otp_record.save()

    return JsonResponse({"message": "Password reset successfully."})
