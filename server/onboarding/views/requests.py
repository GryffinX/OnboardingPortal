import json
import re
from datetime import datetime

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.exceptions import ValidationError

from ..models import OnboardingRequest
from .utils import parse_software_list, dump_software_list, validate_generic_input


DATE_LABEL_FORMAT = "%d %b %Y"


def _format_date(date_value):
    if not date_value:
        return ""
    return date_value.strftime(DATE_LABEL_FORMAT)


def _parse_date_label(value):
    if not value:
        return None

    try:
        return datetime.strptime(value, DATE_LABEL_FORMAT).date()
    except ValueError:
        return None


def _request_numeric_id(request_code, fallback_id):
    match = re.search(r"(\d+)$", request_code or "")
    if match:
        return int(match.group(1))
    return fallback_id


def _get_employee_code_by_name(name):
    if not name: return ""
    from django.contrib.auth.models import User
    from django.db.models import Q
    from ..models import UserProfile
    # Try to find a user whose full name matches the string
    # This is a bit loose but works given the project's current structure
    # A better way would be storing FKs in the request model
    user = User.objects.filter(Q(first_name__icontains=name) | Q(last_name__icontains=name)).first()
    if user:
        try:
            return user.profile.employee_code or ""
        except UserProfile.DoesNotExist:
            pass
    return ""

from django.db import transaction

def _serialize_user(user):
    if not user: return None
    from ..models import UserProfile
    employee_code = ""
    try:
        employee_code = user.profile.employee_code or ""
    except UserProfile.DoesNotExist:
        pass
        
    return {
        "id": user.id,
        "name": f"{user.first_name} {user.last_name}".strip() or user.username,
        "employeeCode": employee_code
    }

def serialize_request(record):
    subject_code = record.employee_code or ""
    if not subject_code:
        from ..models import UserProfile
        from django.contrib.auth.models import User
        # Try to find the user by personal email
        user_obj = User.objects.filter(email=record.personal_email).first()
        if user_obj:
            try:
                subject_code = user_obj.profile.employee_code or ""
            except UserProfile.DoesNotExist:
                pass

    return {
        "id": record.id,
        "requestCode": record.request_code,
        "employeeCode": subject_code,
        "formData": {
            "name": record.employee_name,
            "employeePhoneNumber": record.employee_phone_number,
            "personalEmail": record.personal_email,
            "officialEmailUser": (record.official_email or "").split("@")[0],
            "department": record.department,
            "lineManager": record.line_manager,
            "lineManagerCode": _get_employee_code_by_name(record.line_manager),
            "hod": record.hod,
            "hodCode": _get_employee_code_by_name(record.hod),
        },
        "officialEmail": record.official_email or "",
        "stage": record.stage,
        "submittedAt": _format_date(record.submitted_at),
        "lastUpdated": _format_date(record.last_updated),
        "additionalSoftware": [],
        "managerSoftware": parse_software_list(record.manager_software),
        "hodSoftware": [],
        "preInstalledSoftware": parse_software_list(record.pre_installed_software),
        "employeeInstalledSoftware": parse_software_list(record.employee_installed_software),
        "assetCode": record.asset_code,
        "hodComment": record.hod_comment,
        "stopReason": record.stop_reason,
        "reviewRequestedBy": record.review_requested_by,
        "reviewReason": record.review_reason,
        "revisionCount": record.revision_count,
        "managerApprovedAt": record.manager_approved_at,
        "hodApprovedAt": record.hod_approved_at,
        "dateOfJoining": record.date_of_joining,
        
        # New Infrastructure Fields
        "infraAdminComment": record.infra_admin_comment,
        "infraExecutive": _serialize_user(record.infra_executive),
        "laptopModel": record.laptop_model,
        "laptopRam": record.laptop_ram,
        "laptopStorage": record.laptop_storage,
        "laptopProcessor": record.laptop_processor,
    }


@csrf_exempt
@require_http_methods(["GET"])
def get_requests(request):
    records = OnboardingRequest.objects.all().order_by("-submitted_at", "-id")
    return JsonResponse({"requests": [serialize_request(record) for record in records]})


@csrf_exempt
@require_http_methods(["POST"])
def save_request(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"message": "Invalid JSON payload."}, status=400)

    request_id = payload.get("id")
    
    try:
        with transaction.atomic():
            if request_id:
                # Partial Update by ID
                req = OnboardingRequest.objects.get(id=request_id)
                if "stage" in payload: 
                    req.stage = payload["stage"]
                    if req.stage == "stopped":
                        from django.contrib.auth.models import User
                        user = User.objects.filter(email=req.personal_email).first()
                        if user:
                            user.delete()
                        
                        # Scrub PII
                        req.personal_email = f"deleted_{req.id}@stopped.local"
                        req.employee_phone_number = f"99{str(req.id).zfill(8)}"
                        req.employee_code = ""
                        req.asset_code = ""
                        req.official_email = ""
                if "formData" in payload:
                    fd = payload["formData"]
                    
                    new_phone = (fd.get("employeePhoneNumber") or "").strip()
                    if new_phone and new_phone != req.employee_phone_number:
                        if OnboardingRequest.objects.filter(employee_phone_number=new_phone).exclude(id=req.id).exists():
                            return JsonResponse({"message": "A request with this mobile number already exists."}, status=400)
                    
                    new_email = (fd.get("personalEmail") or "").strip()
                    if new_email and new_email != req.personal_email:
                        if OnboardingRequest.objects.filter(personal_email=new_email).exclude(id=req.id).exists():
                            return JsonResponse({"message": "A request with this email already exists."}, status=400)
                        if User.objects.filter(email=new_email).exists():
                            return JsonResponse({"message": "A user with this email already exists in the system."}, status=400)

                    req.employee_name = fd.get("name", req.employee_name)
                    req.employee_phone_number = new_phone
                    req.personal_email = new_email
                    req.department = fd.get("department", req.department)
                    req.line_manager = fd.get("lineManager", req.line_manager)
                    req.hod = fd.get("hod", req.hod)
                
                if "officialEmail" in payload: req.official_email = payload["officialEmail"]
                if "managerSoftware" in payload: req.manager_software = dump_software_list(payload["managerSoftware"])
                
                if "assetCode" in payload:
                    new_asset_code = (payload["assetCode"] or "").strip()
                    if new_asset_code and new_asset_code != req.asset_code:
                        if OnboardingRequest.objects.filter(asset_code__iexact=new_asset_code).exclude(id=req.id).exists():
                            return JsonResponse({"message": "This Asset Code has already been assigned to another user."}, status=400)
                    req.asset_code = new_asset_code

                if "employeeCode" in payload:
                    from django.contrib.auth.models import User
                    from ..models import UserProfile
                    new_emp_code = (payload["employeeCode"] or "").strip()
                    if new_emp_code and new_emp_code != req.employee_code:
                        # Check uniqueness in OnboardingRequest
                        if OnboardingRequest.objects.filter(employee_code__iexact=new_emp_code).exclude(id=req.id).exists():
                            return JsonResponse({"message": "This Employee Code is already assigned to another request."}, status=400)
                        # Check uniqueness in UserProfile
                        if UserProfile.objects.filter(employee_code__iexact=new_emp_code).exclude(user__email=req.personal_email).exists():
                            return JsonResponse({"message": "This Employee Code is already in use by another portal user."}, status=400)
                    
                    req.employee_code = new_emp_code
                    
                    # Sync with UserProfile if user exists
                    user_obj = User.objects.filter(email=req.personal_email).first()
                    if user_obj:
                        try:
                            user_obj.profile.employee_code = new_emp_code
                            user_obj.profile.save()
                        except UserProfile.DoesNotExist:
                            pass
                
                if "hodComment" in payload:
                    req.hod_comment = (payload["hodComment"] or "").strip()
                
                if "infraAdminComment" in payload:
                    req.infra_admin_comment = (payload["infraAdminComment"] or "").strip()
                
                if "infraExecutive" in payload:
                    from django.contrib.auth.models import User
                    exec_id = payload["infraExecutive"]
                    if exec_id:
                        req.infra_executive = User.objects.filter(id=exec_id).first()
                    else:
                        req.infra_executive = None
                
                if "laptopModel" in payload:
                    req.laptop_model = (payload["laptopModel"] or "").strip()
                if "laptopRam" in payload:
                    req.laptop_ram = (payload["laptopRam"] or "").strip()
                if "laptopStorage" in payload:
                    req.laptop_storage = (payload["laptopStorage"] or "").strip()
                if "laptopProcessor" in payload:
                    req.laptop_processor = (payload["laptopProcessor"] or "").strip()
                
                if "stopReason" in payload:
                    req.stop_reason = (payload["stopReason"] or "").strip()
                
                if "reviewReason" in payload:
                    req.review_reason = payload["reviewReason"]
                
                if "reviewRequestedBy" in payload: req.review_requested_by = payload["reviewRequestedBy"]
                if "revisionCount" in payload: req.revision_count = payload["revisionCount"]
                if "managerApprovedAt" in payload: req.manager_approved_at = payload["managerApprovedAt"]
                if "hodApprovedAt" in payload: req.hod_approved_at = payload["hodApprovedAt"]
                
                if "dateOfJoining" in payload:
                    req.date_of_joining = payload["dateOfJoining"]
                
                req.save()
                return JsonResponse({"message": "Request updated successfully.", "request": serialize_request(req)})

            # Full Create/Update by requestCode
            request_code = (payload.get("requestCode") or "").strip()
            form_data = payload.get("formData") or {}

            if not request_code:
                return JsonResponse({"message": "requestCode or id is required."}, status=400)

            employee_name = (form_data.get("name") or "").strip()
            employee_phone_number = (form_data.get("employeePhoneNumber") or "").strip()
            personal_email = (form_data.get("personalEmail") or "").strip()

            if not employee_name or not personal_email:
                return JsonResponse({"message": "Employee name and personal email are required."}, status=400)

            defaults = {
                "employee_name": employee_name,
                "employee_phone_number": employee_phone_number,
                "personal_email": personal_email,
                "official_email": (payload.get("officialEmail") or "").strip() or None,
                "department": (form_data.get("department") or "").strip(),
                "line_manager": (form_data.get("lineManager") or "").strip(),
                "hod": (form_data.get("hod") or "").strip(),
                "stage": (payload.get("stage") or "manager_review").strip(),
                "pre_installed_software": dump_software_list(payload.get("preInstalledSoftware")),
                "employee_installed_software": dump_software_list(payload.get("employeeInstalledSoftware")),
                "manager_software": dump_software_list(payload.get("managerSoftware")),
                "asset_code": (payload.get("assetCode") or "").strip(),
                "hod_comment": (payload.get("hodComment") or "").strip(),
                "stop_reason": (payload.get("stopReason") or payload.get("reviewReason") or "").strip(),
                "review_requested_by": (payload.get("reviewRequestedBy") or "").strip(),
                "review_reason": (payload.get("reviewReason") or "").strip(),
                "revision_count": int(payload.get("revisionCount") or 0),
                "manager_approved_at": (payload.get("managerApprovedAt") or "").strip(),
                "hod_approved_at": (payload.get("hodApprovedAt") or "").strip(),
                "date_of_joining": (payload.get("dateOfJoining") or "").strip(),
            }

            record, created = OnboardingRequest.objects.update_or_create(
                request_code=request_code,
                defaults=defaults,
            )

            submitted_at = _parse_date_label(payload.get("submittedAt"))
            if submitted_at and record.submitted_at != submitted_at:
                record.submitted_at = submitted_at
                record.save(update_fields=["submitted_at"])
                record.refresh_from_db()

            return JsonResponse(
                {
                    "message": "Request saved successfully." if created else "Request updated successfully.",
                    "request": serialize_request(record),
                }
            )

    except OnboardingRequest.DoesNotExist:
        return JsonResponse({"message": "Request not found."}, status=404)
    except ValidationError as e:
        return JsonResponse({"message": str(e)}, status=400)
    except Exception as exc:
        return JsonResponse({"message": str(exc)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def delete_request(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
        request_id = payload.get("id")
        
        if not request_id:
            return JsonResponse({"message": "Request ID is required."}, status=400)
            
        with transaction.atomic():
            record = OnboardingRequest.objects.get(id=request_id)
            email = record.personal_email
            
            # Delete associated User if exists (this will also delete UserProfile via CASCADE)
            from django.contrib.auth.models import User
            user = User.objects.filter(email=email).first()
            if user:
                user.delete()
                
            record.delete()
            return JsonResponse({"ok": True, "message": "Onboarding request and associated user records deleted permanently."})
    except OnboardingRequest.DoesNotExist:
        return JsonResponse({"message": "Request not found."}, status=404)
    except Exception as exc:
        return JsonResponse({"message": str(exc)}, status=500)
