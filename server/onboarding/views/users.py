import json
from django.conf import settings
from django.core.mail import EmailMessage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
from ..models import UserProfile, Department, PasswordResetOTP
from .utils import normalize_role, validate_user_payload, validate_generic_input, generate_otp, resolve_user_role_and_department
from .changelog import log_change, describe_user_changes
from django.core.exceptions import ValidationError


from django.db import transaction

@csrf_exempt
@require_http_methods(["POST"])
def create_user(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    errors = validate_user_payload(payload)
    if not payload.get("password"):
        errors["password"] = "Password is required."
    
    if errors:
        return JsonResponse({"message": "Validation failed: " + " ".join(errors.values()), "errors": errors}, status=400)

    name = payload.get("name").strip()
    email = payload.get("email").strip()
    phone = (payload.get("phoneNumber") or "").strip()
    employee_code = (payload.get("employeeCode") or "").strip()
    role = normalize_role(payload.get("role") or "Employee")
    department_name = (payload.get("department") or "").strip()
    password = payload.get("password").strip()

    if User.objects.filter(email=email).exists() or User.objects.filter(username=email).exists():
        return JsonResponse({"message": "User with this email already exists."}, status=400)

    # Uniqueness checks for phone and code
    if phone and UserProfile.objects.filter(phone_number=phone).exists():
        return JsonResponse({"message": "This phone number is already assigned to another user."}, status=400)
    
    if employee_code and UserProfile.objects.filter(employee_code=employee_code).exists():
        return JsonResponse({"message": "This employee code is already in use."}, status=400)

    try:
        with transaction.atomic():
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
            if role in ["Infrastructure Admin", "Infrastructure Executive"]:
                department_name = "Infrastructure"
                dept, _ = Department.objects.get_or_create(name=department_name)
            elif department_name:
                dept = Department.objects.filter(name=department_name).first()
            
            # Create profile
            profile.save()

            actor_id = payload.get("actorId")
            if actor_id:
                log_change(
                    actor_id,
                    "User Created",
                    f"Created portal user account for {name} ({email}) with role {role}",
                )

            # Send email to the new user
            try:
                message = EmailMessage(
                    subject="Welcome to Onboarding Portal - Your Account Details",
                    body=(
                        f"Hello {name},\n\n"
                        f"Your account has been created successfully on the Onboarding Portal.\n\n"
                        f"Employee Code: {employee_code}\n"
                        f"Role: {role}\n"
                        f"Department: {department_name}\n\n"
                        f"You can log in using the following credentials:\n"
                        f"Login URL: http://localhost:5173/\n"
                        f"Email: {email}\n"
                        f"Initial Password: {password}\n\n"
                        f"Please change your password after your first login using the 'Forgot Password' flow.\n\n"
                        f"Regards,\nAdmin Team"
                    ),
                    from_email=settings.EMAIL_HOST_USER,
                    to=[email],
                )
                message.send(fail_silently=False)
            except Exception as mail_exc:
                raise Exception(f"Failed to send welcome email: {mail_exc}")

        return JsonResponse({
            "message": "User created successfully. Welcome email sent.",
            "user": {
                "id": user.id,
                "name": name,
                "email": email,
                "role": role,
                "department": department_name,
                "phoneNumber": phone,
                "employeeCode": employee_code,
                "isActive": user.is_active
            }
        })
    except ValidationError as e:
        return JsonResponse({"message": " ".join(e.messages) if hasattr(e, "messages") else str(e)}, status=400)
    except Exception as exc:
        return JsonResponse({"message": "An internal server error occurred."}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def update_user(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    original_email = payload.get("originalEmail")
    if not original_email:
        return JsonResponse({"message": "Original email is required to identify user."}, status=400)

    errors = validate_user_payload(payload)
    if errors:
        return JsonResponse({"message": "Validation failed: " + " ".join(errors.values()), "errors": errors}, status=400)

    name = payload.get("name").strip()
    email = payload.get("email").strip()
    phone = (payload.get("phoneNumber") or "").strip()
    employee_code = (payload.get("employeeCode") or "").strip()
    role = (payload.get("role") or "").strip()
    department_name = (payload.get("department") or "").strip()
    password = (payload.get("password") or "").strip()
    is_active = payload.get("isActive")

    try:
        with transaction.atomic():
            user = User.objects.get(email=original_email)

            before = {
                "name": f"{user.first_name} {user.last_name}".strip() or user.username,
                "email": user.email,
                "role": "",
                "department": "",
                "phone": "",
                "employee_code": "",
                "is_active": user.is_active,
            }
            try:
                before["role"] = user.profile.role
                before["department"] = user.profile.department.name if user.profile.department else ""
                before["phone"] = user.profile.phone_number
                before["employee_code"] = user.profile.employee_code
            except UserProfile.DoesNotExist:
                pass
            
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
            
            if is_active is not None:
                user.is_active = bool(is_active)
            
            user.save()
            
            profile, created = UserProfile.objects.get_or_create(user=user)
            if role:
                profile.role = normalize_role(role)
            
            if profile.role in ["Infrastructure Admin", "Infrastructure Executive"]:
                department_name = "Infrastructure"
                dept, _ = Department.objects.get_or_create(name=department_name)
                profile.department = dept
            elif department_name:
                dept = Department.objects.filter(name=department_name).first()
                profile.department = dept
            
            if phone is not None:
                if phone and UserProfile.objects.filter(phone_number=phone).exclude(user=user).exists():
                    return JsonResponse({"message": "This phone number is already assigned to another user."}, status=400)
                profile.phone_number = phone
            
            if employee_code is not None:
                if employee_code and UserProfile.objects.filter(employee_code=employee_code).exclude(user=user).exists():
                    return JsonResponse({"message": "This employee code is already in use."}, status=400)
                profile.employee_code = employee_code
            
            profile.full_clean()
            profile.save()

            actor_id = payload.get("actorId")
            if actor_id:
                after = {
                    "name": f"{user.first_name} {user.last_name}".strip() or user.username,
                    "email": user.email,
                    "role": profile.role,
                    "department": profile.department.name if profile.department else "",
                    "phone": profile.phone_number,
                    "employee_code": profile.employee_code,
                    "is_active": user.is_active,
                    "password_changed": bool(password),
                }
                description = describe_user_changes(before, after)
                log_change(
                    actor_id,
                    "User Updated",
                    f"Modified account for {after['name']} ({after['email']}): {description}",
                )

            return JsonResponse({
                "message": "User updated successfully.",
                "user": {
                    "id": user.id,
                    "name": f"{user.first_name} {user.last_name}".strip() or user.username,
                    "email": user.email,
                    "role": profile.role,
                    "department": profile.department.name if profile.department else "",
                    "phoneNumber": profile.phone_number,
                    "employeeCode": profile.employee_code,
                    "isActive": user.is_active
                }
            })
    except User.DoesNotExist:
        return JsonResponse({"message": "User not found."}, status=404)
    except ValidationError as e:
        return JsonResponse({"message": " ".join(e.messages) if hasattr(e, "messages") else str(e)}, status=400)
    except Exception as exc:
        return JsonResponse({"message": "An internal server error occurred."}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def request_profile_update_otp(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    current_email = payload.get("currentEmail")
    if not current_email:
        return JsonResponse({"message": "Current email is required."}, status=400)

    otp = generate_otp()
    PasswordResetOTP.objects.create(email=current_email, otp=otp)

    try:
        message = EmailMessage(
            subject="Verification OTP for Profile Update",
            body=f"Your OTP for updating your profile is: {otp}\n\nThis OTP is valid for 10 minutes.",
            from_email=settings.EMAIL_HOST_USER,
            to=[current_email],
        )
        message.send(fail_silently=False)
    except Exception as exc:
        return JsonResponse({"message": "An internal server error occurred."}, status=500)

    return JsonResponse({"message": "Verification OTP sent to your current email."})


@csrf_exempt
@require_http_methods(["POST"])
def verify_profile_update(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    current_email = payload.get("currentEmail")
    otp = payload.get("otp")
    new_data = payload.get("newData", {})

    if not current_email or not otp:
        return JsonResponse({"message": "Email and OTP are required."}, status=400)

    otp_record = PasswordResetOTP.objects.filter(email=current_email, otp=otp, is_verified=False).order_by("-created_at").first()
    if not otp_record or not otp_record.is_valid():
        return JsonResponse({"message": "Invalid or expired OTP."}, status=400)

    errors = validate_user_payload(new_data)
    if errors:
        return JsonResponse({"message": "Validation failed: " + " ".join(errors.values()), "errors": errors}, status=400)

    try:
        with transaction.atomic():
            user = User.objects.get(email=current_email)
            
            name = new_data.get("name")
            email = new_data.get("email")
            phone = new_data.get("phoneNumber")
            employee_code = new_data.get("employeeCode")
            password = new_data.get("password")

            if name:
                parts = name.strip().split(" ")
                user.first_name = parts[0]
                user.last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
            
            if email is not None:
                if not email:
                    return JsonResponse({"message": "Email cannot be empty."}, status=400)
                if email != current_email:
                    if User.objects.filter(email=email).exclude(id=user.id).exists():
                        return JsonResponse({"message": "The new email is already in use by another user."}, status=400)
                    user.email = email
                    user.username = email
            
            if password:
                user.set_password(password)
            
            user.save()

            profile, _ = UserProfile.objects.get_or_create(user=user)
            if phone is not None:
                phone_val = phone.strip()
                if phone_val and UserProfile.objects.filter(phone_number=phone_val).exclude(user=user).exists():
                    return JsonResponse({"message": "This phone number is already assigned to another user."}, status=400)
                profile.phone_number = phone_val
            
            if employee_code is not None:
                code_val = employee_code.strip()
                if code_val and UserProfile.objects.filter(employee_code=code_val).exclude(user=user).exists():
                    return JsonResponse({"message": "This employee code is already in use."}, status=400)
                profile.employee_code = code_val
                
            profile.full_clean()
            profile.save()

            otp_record.delete()

            user.refresh_from_db()
            return JsonResponse({
                "message": "Profile updated successfully.",
                "user": {
                    "id": user.id,
                    "name": f"{user.first_name} {user.last_name}".strip() or user.username,
                    "email": user.email,
                    "role": profile.role,
                    "department": profile.department.name if profile.department else "",
                    "phoneNumber": profile.phone_number,
                    "employeeCode": profile.employee_code,
                    "isActive": user.is_active
                }
            })
    except User.DoesNotExist:
        return JsonResponse({"message": "User not found."}, status=404)
    except ValidationError as e:
        return JsonResponse({"message": " ".join(e.messages) if hasattr(e, "messages") else str(e)}, status=400)
    except Exception as exc:
        return JsonResponse({"message": "An internal server error occurred."}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def create_department(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    name = (payload.get("name") or "").strip()
    err = validate_generic_input(name, "Department Name")
    if err:
        return JsonResponse({"message": err}, status=400)

    if Department.objects.filter(name=name).exists():
        return JsonResponse({"message": "Department already exists."}, status=400)

    try:
        dept = Department(name=name)
        dept.full_clean()
        dept.save()

        actor_id = payload.get("actorId")
        if actor_id:
            log_change(actor_id, "Department Created", f"Added department '{name}'")

        return JsonResponse({"message": "Department created successfully.", "name": name})
    except ValidationError as e:
        return JsonResponse({"message": " ".join(e.messages) if hasattr(e, "messages") else str(e)}, status=400)
    except Exception as exc:
        return JsonResponse({"message": "An internal server error occurred."}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def get_users(request):
    users = User.objects.all().select_related('profile', 'profile__department')
    user_list = []
    for user in users:
        role, department_name, phone_number, employee_code, is_active = resolve_user_role_and_department(user)
            
        user_list.append({
            "id": user.id,
            "name": f"{user.first_name} {user.last_name}".strip() or user.username,
            "email": user.email,
            "role": role,
            "department": department_name,
            "phoneNumber": phone_number,
            "employeeCode": employee_code,
            "isActive": is_active
        })
    return JsonResponse({"users": user_list})


@csrf_exempt
@require_http_methods(["POST"])
def bulk_update_users_status(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
        is_active = payload.get("isActive")
        
        if is_active is None:
            return JsonResponse({"message": "Status (isActive) is required"}, status=400)
            
        # Update all users except superusers to avoid locking out admins
        users = User.objects.filter(is_superuser=False)
        count = users.count()
        users.update(is_active=bool(is_active))
        
        status_label = "activated" if is_active else "deactivated"

        actor_id = payload.get("actorId")
        if actor_id:
            log_change(
                actor_id,
                "Bulk Status Update",
                f"Mass {status_label} {count} user accounts",
            )

        return JsonResponse({"ok": True, "message": f"Successfully {status_label} {count} user accounts."})
    except Exception as exc:
        return JsonResponse({"message": "An internal server error occurred."}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def delete_user(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    email = payload.get("email")

    if not email:
        return JsonResponse({"message": "Email is required to identify user."}, status=400)

    try:
        user = User.objects.get(email=email)
        user_name = f"{user.first_name} {user.last_name}".strip() or user.username
        user.delete()

        actor_id = payload.get("actorId")
        if actor_id:
            log_change(
                actor_id,
                "User Deleted",
                f"Permanently removed account for {user_name} ({email})",
            )

        return JsonResponse({"message": "User deleted successfully."})
    except User.DoesNotExist:
        return JsonResponse({"message": "User not found."}, status=404)
    except Exception as exc:
        return JsonResponse({"message": "An internal server error occurred."}, status=500)
