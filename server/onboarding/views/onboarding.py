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
from .utils import validate_payload, build_message


@csrf_exempt
@require_http_methods(["POST", "GET"])
def onboarding_requests_view(request):
    if request.method == "GET":
        requests = OnboardingRequest.objects.all().order_by("-id")
        request_list = []
        for req in requests:
            request_list.append({
                "id": req.id,
                "requestCode": req.request_code,
                "formData": {
                    "name": req.employee_name,
                    "personalEmail": req.personal_email,
                    "officialEmailUser": req.official_email.split("@")[0] if req.official_email else "",
                    "department": req.department,
                    "lineManager": req.line_manager,
                    "hod": req.hod,
                },
                "officialEmail": req.official_email or "",
                "stage": req.stage,
                "submittedAt": req.submitted_at.strftime("%d %b %Y"),
                "lastUpdated": req.last_updated.strftime("%d %b %Y"),
                "preInstalledSoftware": req.pre_installed_software.split(", ") if req.pre_installed_software else [],
                "employeeInstalledSoftware": req.employee_installed_software.split(", ") if req.employee_installed_software else [],
                "managerSoftware": req.manager_software.split(", ") if req.manager_software else [],
                "hodSoftware": req.hod_software.split(", ") if req.hod_software else [],
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
                req.employee_name = fd.get("name", req.employee_name)
                req.personal_email = fd.get("personalEmail", req.personal_email)
                req.department = fd.get("department", req.department)
                req.line_manager = fd.get("lineManager", req.line_manager)
                req.hod = fd.get("hod", req.hod)
            
            if "officialEmail" in payload: req.official_email = payload["officialEmail"]
            if "managerSoftware" in payload: req.manager_software = ", ".join(payload["managerSoftware"])
            if "assetCode" in payload: req.asset_code = (payload["assetCode"] or "").strip()
            if "hodComment" in payload: req.hod_comment = (payload["hodComment"] or "").strip()
            if "stopReason" in payload: req.stop_reason = (payload["stopReason"] or "").strip()
            if "reviewRequestedBy" in payload: req.review_requested_by = payload["reviewRequestedBy"]
            if "reviewReason" in payload: req.review_reason = payload["reviewReason"]
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
    request_code = payload.get("requestCode")

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
            dept = Department.objects.filter(name=department_name).first()

            # Create/Update profile
            UserProfile.objects.update_or_create(
                user=user, 
                defaults={"role": "Employee", "department": dept}
            )

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
                        f"Please log in and change your password immediately using the 'Forgot Password' link.\n\n"
                        f"Regards,\nHR"
                    ),
                    from_email=settings.EMAIL_HOST_USER,
                    to=[email],
                )
                message.send(fail_silently=False)
            except Exception as mail_exc:
                if settings.DEBUG:
                    print(f"Failed to send welcome email: {mail_exc}")
        
        # Update OnboardingRequest stage if request_code provided
        if request_code:
            try:
                onb_req = OnboardingRequest.objects.get(request_code=request_code)
                onb_req.stage = "approved"
                onb_req.stop_reason = ""
                onb_req.save()
            except OnboardingRequest.DoesNotExist:
                pass

        return JsonResponse({
            "message": "User account is active.",
            "password": default_password,
            "created": default_password is not None
        })
    except Exception as exc:
        return JsonResponse({"message": f"Error finalising onboarding: {str(exc)}"}, status=500)
