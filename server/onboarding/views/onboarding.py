import json
import random
import string
from django.conf import settings
from django.core.mail import EmailMessage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
from ..models import UserProfile, Department, OnboardingRequest
from .utils import validate_payload, build_message, validate_user_payload, validate_generic_input, parse_software_list, dump_software_list
from django.core.exceptions import ValidationError


def _get_employee_code_by_name(name):
    if not name: return ""
    from django.contrib.auth.models import User
    from ..models import UserProfile
    user = User.objects.filter(models.Q(first_name__icontains=name) | models.Q(last_name__icontains=name)).first()
    if user:
        try:
            return user.profile.employee_code or ""
        except UserProfile.DoesNotExist:
            pass
    return ""

@csrf_exempt
@require_http_methods(["POST", "GET"])
def onboarding_requests_view(request):
    if request.method == "GET":
        from django.db.models import Q
        requests = OnboardingRequest.objects.all().order_by("-id")
        request_list = []
        for req in requests:
            # Try to find the user by personal email to get their code
            subject_code = ""
            user_obj = User.objects.filter(email=req.personal_email).first()
            if user_obj:
                try:
                    subject_code = user_obj.profile.employee_code or ""
                except UserProfile.DoesNotExist:
                    pass

            request_list.append({
                "id": req.id,
                "requestCode": req.request_code,
                "employeeCode": subject_code,
                "formData": {
                    "name": req.employee_name,
                    "employeePhoneNumber": req.employee_phone_number,
                    "personalEmail": req.personal_email,
                    "officialEmailUser": req.official_email.split("@")[0] if req.official_email else "",
                    "department": req.department,
                    "lineManager": req.line_manager,
                    "lineManagerCode": _get_employee_code_by_name(req.line_manager),
                    "hod": req.hod,
                    "hodCode": _get_employee_code_by_name(req.hod),
                },
                "officialEmail": req.official_email or "",
                "stage": req.stage,
                "submittedAt": req.submitted_at.strftime("%d %b %Y"),
                "lastUpdated": req.last_updated.strftime("%d %b %Y"),
                "preInstalledSoftware": parse_software_list(req.pre_installed_software),
                "employeeInstalledSoftware": parse_software_list(req.employee_installed_software),
                "managerSoftware": parse_software_list(req.manager_software),
                "hodSoftware": [],
                "reviewRequestedBy": req.review_requested_by,
                "reviewReason": req.review_reason,
                "revisionCount": req.revision_count,
                "managerApprovedAt": req.manager_approved_at,
                "hodApprovedAt": req.hod_approved_at,
            })
        return JsonResponse({"requests": request_list})

    # POST (Update or Create)
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    request_id = payload.get("id")
    
    if request_id:
        # Update existing
        try:
            req = OnboardingRequest.objects.get(id=request_id)
            if "stage" in payload: req.stage = payload["stage"]
            if "formData" in payload:
                fd = payload["formData"]
                
                # Validation before update
                errors = validate_payload(fd)
                if errors:
                    return JsonResponse({"message": "Invalid form data.", "errors": errors}, status=400)

                req.employee_name = fd.get("name", req.employee_name)
                req.employee_phone_number = fd.get("employeePhoneNumber", req.employee_phone_number)
                req.personal_email = fd.get("personalEmail", req.personal_email)
                req.department = fd.get("department", req.department)
                req.line_manager = fd.get("lineManager", req.line_manager)
                req.hod = fd.get("hod", req.hod)
            
            if "officialEmail" in payload: req.official_email = payload["officialEmail"]
            if "managerSoftware" in payload: req.manager_software = dump_software_list(payload["managerSoftware"])
            
            # Additional validation for review fields if they are in payload
            if "assetCode" in payload:
                err = validate_generic_input(payload["assetCode"], "Asset Code")
                if err: return JsonResponse({"message": err}, status=400)
                req.asset_code = (payload["assetCode"] or "").strip()
            
            if "hodComment" in payload:
                if payload["hodComment"]:
                    err = validate_generic_input(payload["hodComment"], "HOD Comment")
                    if err: return JsonResponse({"message": err}, status=400)
                req.hod_comment = (payload["hodComment"] or "").strip()
            
            if "stopReason" in payload:
                err = validate_generic_input(payload["stopReason"], "Stop Reason")
                if err: return JsonResponse({"message": err}, status=400)
                req.stop_reason = (payload["stopReason"] or "").strip()
            
            if "reviewReason" in payload:
                err = validate_generic_input(payload["reviewReason"], "Review Reason")
                if err: return JsonResponse({"message": err}, status=400)
                req.review_reason = payload["reviewReason"]
            
            if "reviewRequestedBy" in payload: req.review_requested_by = payload["reviewRequestedBy"]
            if "revisionCount" in payload: req.revision_count = payload["revisionCount"]
            if "managerApprovedAt" in payload: req.manager_approved_at = payload["managerApprovedAt"]
            if "hodApprovedAt" in payload: req.hod_approved_at = payload["hodApprovedAt"]
            
            req.save()
            return JsonResponse({"message": "Request updated successfully."})
        except OnboardingRequest.DoesNotExist:
            return JsonResponse({"message": "Request not found."}, status=404)
    
    return JsonResponse({"message": "Method not allowed or missing ID for update."}, status=405)


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

    # Check uniqueness of employee_phone_number and personal_email
    employee_phone_number = (payload.get("employeePhoneNumber") or "").strip()
    personal_email = (payload.get("personalEmail") or "").strip()
    
    errors = {}
    if OnboardingRequest.objects.filter(employee_phone_number=employee_phone_number).exists():
        errors["employeePhoneNumber"] = "A request with this mobile number already exists."
    
    if OnboardingRequest.objects.filter(personal_email=personal_email).exists():
        errors["personalEmail"] = "A request with this email already exists."
        
    if User.objects.filter(email=personal_email).exists() or User.objects.filter(username=personal_email).exists():
        errors["personalEmail"] = "A user with this email already exists in the system."

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
        
        # Robust unique code generation
        last_request = OnboardingRequest.objects.order_by("-id").first()
        next_num = 101
        if last_request:
            try:
                # Extract number from ONB-XXX
                last_code = last_request.request_code
                if "-" in last_code:
                    next_num = int(last_code.split("-")[-1]) + 1
                else:
                    next_num = last_request.id + 101
            except (ValueError, IndexError):
                next_num = last_request.id + 101
        
        # Ensure true uniqueness by checking existence
        while OnboardingRequest.objects.filter(request_code=f"ONB-{next_num}").exists():
            next_num += 1
            
        req_code = f"ONB-{next_num}"
        
        OnboardingRequest.objects.create(
            request_code=req_code,
            employee_name=payload["name"],
            employee_phone_number=payload["employeePhoneNumber"],
            personal_email=payload["personalEmail"],
            official_email=official_email,
            department=payload["department"],
            line_manager=payload["lineManager"],
            hod=payload["hod"],
            stage="manager_review"
        )

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


def get_next_employee_code():
    import re
    from ..models import UserProfile
    profiles = UserProfile.objects.exclude(employee_code__isnull=True).exclude(employee_code='')
    max_num = 999
    for p in profiles:
        match = re.search(r"^(\d{4,})$", p.employee_code)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num
    
    return str(max_num + 1)

@csrf_exempt
@require_http_methods(["POST"])
def finalize_onboarding(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    errors = validate_user_payload(payload)
    if errors:
        return JsonResponse({"message": "Validation failed.", "errors": errors}, status=400)

    name = payload.get("name").strip()
    email = payload.get("email").strip()
    department_name = (payload.get("department") or "").strip()
    request_code = payload.get("requestCode")

    try:
        # Check if user already exists
        user = User.objects.filter(email=email).first() or User.objects.filter(username=email).first()
        
        # Get Onboarding Request Details
        onb_req = None
        if request_code:
            onb_req = OnboardingRequest.objects.filter(request_code=request_code).first()

        # Uniqueness checks for final account creation
        if not user:
            phone = (onb_req.employee_phone_number if onb_req else "").strip()
            if phone and UserProfile.objects.filter(phone_number=phone).exists():
                return JsonResponse({"message": "The mobile number from this request is already assigned to another registered user."}, status=400)

        default_password = None
        employee_code = ""
        
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
            dept = Department.objects.filter(name=department_name).first()

            # Generate employee_code if not provided
            employee_code = payload.get("employeeCode")
            if not employee_code:
                employee_code = get_next_employee_code()

            # Create/Update profile
            profile, created = UserProfile.objects.update_or_create(
                user=user, 
                defaults={"role": "Employee", "department": dept, "employee_code": employee_code}
            )
            profile.full_clean()
            profile.save()

            # Send email only to new users with FULL DETAILS
            try:
                # Prepare software lists for email
                pre_sw = ", ".join(parse_software_list(onb_req.pre_installed_software)) if onb_req else "Standard Pre-installed"
                emp_sw = ", ".join(parse_software_list(onb_req.employee_installed_software)) if onb_req else "Standard Employee Setup"
                mgr_sw = ", ".join(parse_software_list(onb_req.manager_software)) if onb_req else "N/A"
                asset_code = onb_req.asset_code if onb_req else "Pending"
                official_email = onb_req.official_email if onb_req else email

                body_lines = [
                    f"Hello {name},",
                    "",
                    "Congratulations! Your onboarding has been fully approved.",
                    "Your institutional account and IT profile have been created successfully.",
                    "",
                    "--- ACCOUNT DETAILS ---",
                    f"Employee Code: {employee_code}",
                    f"Official Email: {official_email}",
                    f"Default Password: {default_password}",
                    "Please log in and change your password immediately via the 'Forgot Password' link.",
                    "",
                    "--- IT ASSETS & SETUP ---",
                    f"Hardware Asset Code: {asset_code}",
                    f"Pre-installed Software: {pre_sw}",
                    f"Software to install: {emp_sw}",
                    f"Additional Software (Manager requested): {mgr_sw}",
                    "",
                    "--- REPORTING STRUCTURE ---",
                    f"Department: {department_name}",
                    f"Line Manager: {onb_req.line_manager if onb_req else 'N/A'}",
                    f"HOD: {onb_req.hod if onb_req else 'N/A'}",
                    "",
                    "Regards,",
                    "Institutional HR Team"
                ]

                message = EmailMessage(
                    subject=f"Welcome to the Team! Your Onboarding is Approved ({employee_code})",
                    body="\n".join(body_lines),
                    from_email=settings.EMAIL_HOST_USER,
                    to=[email],
                )
                message.send(fail_silently=False)
            except Exception as mail_exc:
                if settings.DEBUG:
                    print(f"Failed to send welcome email: {mail_exc}")
        
        # Update OnboardingRequest stage if request_code provided
        if onb_req:
            onb_req.stage = "approved"
            onb_req.stop_reason = ""
            if employee_code:
                onb_req.employee_code = employee_code
            onb_req.save()

        return JsonResponse({
            "message": "User account is active.",
            "password": default_password,
            "created": default_password is not None,
            "employeeCode": employee_code
        })
    except ValidationError as e:
        return JsonResponse({"message": str(e)}, status=400)
    except Exception as exc:
        return JsonResponse({"message": f"Error finalising onboarding: {str(exc)}"}, status=500)
