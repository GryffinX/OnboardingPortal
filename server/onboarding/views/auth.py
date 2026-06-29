import json
import re
from django.conf import settings
from django.core import signing
from django.core.mail import EmailMessage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from ..models import PasswordResetOTP, UserProfile, Department
from .utils import generate_otp, PERSONAL_EMAIL_REGEX, normalize_role, resolve_user_role_and_department


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

    reset_token = signing.dumps(
        {
            "email": email,
            "otp": otp,
        },
        salt="password-reset",
    )

    otp_record.delete()

    return JsonResponse({"message": "OTP verified successfully.", "resetToken": reset_token})


@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email or not password:
        return JsonResponse({"message": "Email and password are required."}, status=400)

    # Try to authenticate with email as username
    user = authenticate(request, username=email, password=password)
    
    if user is None:
        # Try to find user by email and then authenticate
        user_obj = User.objects.filter(email__iexact=email).first()
        if user_obj:
            user = authenticate(request, username=user_obj.username, password=password)

    if user is not None:
        role, department_name, phone_number, employee_code, is_active = resolve_user_role_and_department(user)
        
        from .utils import generate_jwt
        token = generate_jwt(user)

        return JsonResponse({
            "message": "Login successful",
            "token": token,
            "user": {
                "id": user.id,
                "name": f"{user.first_name} {user.last_name}".strip() or user.username,
                "email": user.email,
                "role": role,
                "department": department_name,
                "phoneNumber": phone_number,
                "employeeCode": employee_code,
                "isActive": is_active
            }
        })
    else:
        return JsonResponse({"message": "Invalid credentials."}, status=401)


@csrf_exempt
@require_http_methods(["POST"])
def reset_password(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    reset_token = (payload.get("resetToken") or "").strip()
    password = (payload.get("password") or "").strip()

    if not reset_token or not password:
        return JsonResponse({"message": "Verified reset session and new password are required."}, status=400)

    try:
        token_data = signing.loads(reset_token, salt="password-reset", max_age=600)
    except signing.BadSignature:
        return JsonResponse({"message": "Invalid or expired reset session."}, status=400)

    email = (token_data.get("email") or "").strip()

    # Find user and reset password
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse({"message": "User not found."}, status=404)

    user.set_password(password)
    user.save()

    return JsonResponse({"message": "Password reset successfully."})
