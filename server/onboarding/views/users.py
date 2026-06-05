import json
from django.conf import settings
from django.core.mail import EmailMessage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
from ..models import UserProfile, Department


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
    department_name = (payload.get("department") or "").strip()
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
        
        # Find department
        dept = None
        if department_name:
            dept = Department.objects.filter(name=department_name).first()
        
        # Create profile
        UserProfile.objects.create(user=user, role=role, department=dept)

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
            if settings.DEBUG:
                print(f"Failed to send welcome email: {mail_exc}")

        return JsonResponse({
            "message": "User created successfully. Welcome email sent.",
            "user": {
                "name": name,
                "email": email,
                "role": role,
                "department": department_name
            }
        })
    except Exception as exc:
        return JsonResponse({"message": f"Error creating user: {str(exc)}"}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def update_user(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    original_email = payload.get("originalEmail")
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip()
    role = (payload.get("role") or "").strip()
    department_name = (payload.get("department") or "").strip()
    password = (payload.get("password") or "").strip()

    if not original_email:
        return JsonResponse({"message": "Original email is required to identify user."}, status=400)

    try:
        user = User.objects.get(email=original_email)
        
        if name:
            first_name = name.split(" ")[0]
            last_name = " ".join(name.split(" ")[1:]) if " " in name else ""
            user.first_name = first_name
            user.last_name = last_name
        
        if email and email != original_email:
            if User.objects.filter(email=email).exclude(id=user.id).exists():
                return JsonResponse({"message": "New email already in use."}, status=400)
            user.email = email
            user.username = email
        
        if password:
            user.set_password(password)
        
        user.save()
        
        profile, created = UserProfile.objects.get_or_create(user=user)
        if role:
            profile.role = role
        if department_name:
            dept = Department.objects.filter(name=department_name).first()
            profile.department = dept
        profile.save()

        return JsonResponse({
            "message": "User updated successfully.",
            "user": {
                "name": f"{user.first_name} {user.last_name}".strip() or user.username,
                "email": user.email,
                "role": profile.role,
                "department": profile.department.name if profile.department else ""
            }
        })
    except User.DoesNotExist:
        return JsonResponse({"message": "User not found."}, status=404)
    except Exception as exc:
        return JsonResponse({"message": f"Error updating user: {str(exc)}"}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def get_users(request):
    users = User.objects.all().select_related('profile', 'profile__department')
    user_list = []
    for user in users:
        role = "Employee"
        department_name = ""
        try:
            role = user.profile.role
            department_name = user.profile.department.name if user.profile.department else ""
        except UserProfile.DoesNotExist:
            pass
            
        user_list.append({
            "name": f"{user.first_name} {user.last_name}".strip() or user.username,
            "email": user.email,
            "role": role,
            "department": department_name
        })
    return JsonResponse({"users": user_list})
