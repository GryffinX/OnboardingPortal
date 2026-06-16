import json
import re
from datetime import datetime

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.exceptions import ValidationError

from ..models import OnboardingRequest, AssetInventory, validate_comment_text
from .utils import parse_software_list, dump_software_list, validate_generic_input, send_workflow_notification
from .changelog import log_change, snapshot_request, describe_request_changes, is_admin_user, get_actor
from .common import get_department_software_lists


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
    department_lists = get_department_software_lists(record.department)
    subject_code = record.employee_code or ""
    if not subject_code:
        from ..models import UserProfile
        from django.contrib.auth.models import User
        from django.db.models import Q
        # Try to find the user by personal or official email
        user_obj = User.objects.filter(Q(email=record.personal_email) | Q(email=record.official_email)).first()
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
        "preInstalledSoftware": department_lists["preInstalledSoftware"],
        "employeeInstalledSoftware": department_lists["employeeInstalledSoftware"],
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
        "infraAdmin": _serialize_user(record.infra_admin),
        "infraAdminComment": record.infra_admin_comment,
        "infraExecutive": _serialize_user(record.infra_executive),
        "infraSoftware": parse_software_list(record.infra_software),
        "laptopModel": record.laptop_model,
        "laptopRam": record.laptop_ram,
        "laptopStorage": record.laptop_storage,
        "laptopProcessor": record.laptop_processor,
        "laptopGpu": record.laptop_gpu,
        "laptopAcknowledged": record.laptop_acknowledged,
    }

# --- ASSET INVENTORY VIEWS ---

@csrf_exempt
@require_http_methods(["GET"])
def get_assets(request):
    assets = AssetInventory.objects.all().order_by("asset_code")
    asset_list = []
    for asset in assets:
        assigned_count = OnboardingRequest.objects.filter(asset_code=asset.asset_code).exclude(asset_code="").count()
        asset_list.append({
            "id": asset.id,
            "assetCode": asset.asset_code,
            "laptopModel": asset.laptop_model,
            "laptopProcessor": asset.laptop_processor,
            "laptopRam": asset.laptop_ram,
            "laptopStorage": asset.laptop_storage,
            "laptopGpu": asset.laptop_gpu,
            "assignedCount": assigned_count,
            "isAssigned": assigned_count > 0 or asset.is_assigned,
        })
    return JsonResponse({"assets": asset_list})

@csrf_exempt
@require_http_methods(["POST"])
def create_asset(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
        asset_code = (payload.get("assetCode") or "").strip()
        
        if not asset_code:
            return JsonResponse({"message": "Asset code is required."}, status=400)
            
        # Removed uniqueness check to allow multi-candidate/repeat codes if needed, 
        # though usually codes are unique per machine. 
        # User said "one asset code can be used for multiple candidates".

        asset = AssetInventory.objects.create(
            asset_code=asset_code,
            laptop_model=(payload.get("laptopModel") or "").strip(),
            laptop_processor=(payload.get("laptopProcessor") or "").strip(),
            laptop_ram=(payload.get("laptopRam") or "").strip(),
            laptop_storage=(payload.get("laptopStorage") or "").strip(),
            laptop_gpu=(payload.get("laptopGpu") or "").strip()
        )

        actor_id = payload.get("actorId")
        if actor_id:
            log_change(
                actor_id,
                "Asset Created",
                f"Added hardware asset {asset.asset_code} ({asset.laptop_model}) to inventory",
            )

        return JsonResponse({"message": "Asset added to inventory.", "asset": {
            "id": asset.id, "assetCode": asset.asset_code, "laptopModel": asset.laptop_model
        }})
    except ValidationError as e:
        return JsonResponse({"message": str(e)}, status=400)
    except Exception as exc:
        return JsonResponse({"message": f"Failed to create asset: {str(exc)}"}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def update_asset(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
        asset_id = payload.get("id")
        if not asset_id: return JsonResponse({"message": "ID required."}, status=400)
        
        asset = AssetInventory.objects.get(id=asset_id)
        old_code = asset.asset_code

        if "assetCode" in payload: asset.asset_code = payload["assetCode"].strip()
        if "laptopModel" in payload: asset.laptop_model = payload["laptopModel"].strip()
        if "laptopProcessor" in payload: asset.laptop_processor = payload["laptopProcessor"].strip()
        if "laptopRam" in payload: asset.laptop_ram = payload["laptopRam"].strip()
        if "laptopStorage" in payload: asset.laptop_storage = payload["laptopStorage"].strip()
        if "laptopGpu" in payload: asset.laptop_gpu = payload["laptopGpu"].strip()
        if "isAssigned" in payload: asset.is_assigned = payload["isAssigned"]
        
        asset.save()

        actor_id = payload.get("actorId")
        if actor_id:
            changes = []
            if "assetCode" in payload and old_code != asset.asset_code:
                changes.append(f"Asset Code: '{old_code}' → '{asset.asset_code}'")
            for field, label in [
                ("laptopModel", "Model"),
                ("laptopProcessor", "Processor"),
                ("laptopRam", "RAM"),
                ("laptopStorage", "Storage"),
                ("laptopGpu", "GPU"),
            ]:
                if field in payload:
                    changes.append(f"{label} updated")
            if "isAssigned" in payload:
                status = "assigned" if asset.is_assigned else "unassigned"
                changes.append(f"Marked as {status}")
            desc = "; ".join(changes) if changes else f"Updated details for asset {old_code}"
            log_change(actor_id, "Asset Updated", desc)

        return JsonResponse({"message": "Asset updated successfully."})
    except AssetInventory.DoesNotExist:
        return JsonResponse({"message": "Asset not found."}, status=404)
    except Exception as exc:
        return JsonResponse({"message": f"Failed to update asset: {str(exc)}"}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def delete_asset(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
        asset_id = payload.get("id")
        asset = AssetInventory.objects.get(id=asset_id)
        asset_code = asset.asset_code
        assigned_count = OnboardingRequest.objects.filter(asset_code=asset_code).exclude(asset_code="").count()

        if assigned_count > 0 or asset.is_assigned:
            return JsonResponse({"message": f"This asset is assigned to {assigned_count} employee(s) and cannot be deleted."}, status=400)
        asset.delete()

        actor_id = payload.get("actorId")
        if actor_id:
            log_change(actor_id, "Asset Deleted", f"Removed asset {asset_code} from inventory")

        return JsonResponse({"message": "Asset deleted from inventory."})
    except Exception:
        return JsonResponse({"message": "Failed to delete asset."}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_requests(request):
    records = OnboardingRequest.objects.all().order_by("-submitted_at", "-id")
    return JsonResponse({"requests": [serialize_request(record) for record in records]})


@csrf_exempt
@require_http_methods(["POST"])
def acknowledge_laptop(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
        request_id = payload.get("id")
        
        if not request_id:
            return JsonResponse({"message": "Request ID is required."}, status=400)
            
        record = OnboardingRequest.objects.get(id=request_id)
        record.laptop_acknowledged = True
        record.save()
        
        return JsonResponse({"message": "Laptop receipt acknowledged successfully.", "request": serialize_request(record)})
    except OnboardingRequest.DoesNotExist:
        return JsonResponse({"message": "Request not found."}, status=404)
    except Exception as exc:
        return JsonResponse({"message": "An internal server error occurred."}, status=500)


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
                before = snapshot_request(req)
                old_stage = req.stage
                if "stage" in payload: 
                    new_stage = payload["stage"]
                    req.stage = new_stage
                    
                    # Notify the person responsible for the NEW stage if it changed
                    if new_stage != old_stage:
                        try:
                            # We might need to save other fields first so they are in the record object passed to mail
                            # But since this is in an atomic transaction, we can just call it with the current req object
                            # However, for infra_executive_review, we need the assigned exec to be set
                            pass 
                        except Exception:
                            pass

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

                    software_lists = get_department_software_lists(req.department)
                    req.pre_installed_software = dump_software_list(software_lists["preInstalledSoftware"])
                    req.employee_installed_software = dump_software_list(software_lists["employeeInstalledSoftware"])
                
                if "officialEmail" in payload: req.official_email = payload["officialEmail"]
                if "managerSoftware" in payload: req.manager_software = dump_software_list(payload["managerSoftware"])
                
                if "assetCode" in payload:
                    req.asset_code = (payload["assetCode"] or "").strip()

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
                    val = (payload["hodComment"] or "").strip()
                    if val:
                        try:
                            validate_comment_text(val)
                        except ValidationError as ve:
                            return JsonResponse({"message": str(ve)}, status=400)
                    req.hod_comment = val
                
                if "infraAdminComment" in payload:
                    val = (payload["infraAdminComment"] or "").strip()
                    if val:
                        try:
                            validate_comment_text(val)
                        except ValidationError as ve:
                            return JsonResponse({"message": str(ve)}, status=400)
                    req.infra_admin_comment = val
                
                if "infraAdminId" in payload:
                    from django.contrib.auth.models import User
                    admin_id = payload["infraAdminId"]
                    if admin_id:
                        req.infra_admin = User.objects.filter(id=admin_id).first()
                    else:
                        req.infra_admin = None
                
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
                if "laptopGpu" in payload:
                    req.laptop_gpu = (payload["laptopGpu"] or "").strip()
                
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
                
                if "infraSoftware" in payload:
                    req.infra_software = dump_software_list(payload["infraSoftware"])
                
                # Revision count logic: only increment when sent for HR Review
                if "stage" in payload and payload["stage"] == "hr_review":
                    req.revision_count += 1
                
                # Check if we should notify next stage (called after potential field updates like infraExecutive)
                if "stage" in payload and payload["stage"] != old_stage:
                    try:
                        send_workflow_notification(req, payload["stage"])
                    except Exception as mail_err:
                        # Log mail error but don't fail the whole request update if mail fails at intermediate stages
                        print(f"Workflow stage notification failed: {mail_err}")
                
                req.save()
                
                actor_id = payload.get("actorId")
                action_type = payload.get("actionType", "Update")
                if actor_id:
                    description = describe_request_changes(before, req)
                    log_change(actor_id, action_type, description, req)

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

            software_lists = get_department_software_lists(defaults["department"])
            defaults["pre_installed_software"] = dump_software_list(software_lists["preInstalledSoftware"])
            defaults["employee_installed_software"] = dump_software_list(software_lists["employeeInstalledSoftware"])

            record, created = OnboardingRequest.objects.update_or_create(
                request_code=request_code,
                defaults=defaults,
            )

            submitted_at = _parse_date_label(payload.get("submittedAt"))
            if submitted_at and record.submitted_at != submitted_at:
                record.submitted_at = submitted_at
                record.save(update_fields=["submitted_at"])
                record.refresh_from_db()

            actor_id = payload.get("actorId")
            if actor_id:
                action_type = payload.get("actionType", "Request Created" if created else "Request Updated")
                if created:
                    description = f"Created onboarding request {record.request_code} for {record.employee_name}"
                else:
                    description = f"Updated onboarding request {record.request_code} for {record.employee_name}"
                log_change(actor_id, action_type, description, record)

            return JsonResponse(
                {
                    "message": "Request saved successfully." if created else "Request updated successfully.",
                    "request": serialize_request(record),
                }
            )

    except OnboardingRequest.DoesNotExist:
        return JsonResponse({"message": "Request not found."}, status=404)
    except ValidationError as e:
        msg = ""
        if hasattr(e, "message_dict"):
            msg = "; ".join([f"{k}: {', '.join(v)}" for k, v in e.message_dict.items()])
        elif hasattr(e, "messages"):
            msg = " ".join(e.messages)
        else:
            msg = str(e)
        return JsonResponse({"message": msg}, status=400)
    except Exception as exc:
        return JsonResponse({"message": "An internal server error occurred."}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_changelogs(request):
    from django.utils import timezone
    from ..models import ChangeLog

    actor_id = request.GET.get("actorId")
    actor = get_actor(actor_id)
    if not is_admin_user(actor):
        return JsonResponse({"message": "Access denied. Admin privileges required."}, status=403)

    logs = ChangeLog.objects.select_related("request").all().order_by("-timestamp")
    log_list = []
    for log in logs:
        # Use denormalized fields if relationship is missing (common for organizational changes)
        req_code = log.request_code or (log.request.request_code if log.request else "N/A")
        emp_name = log.employee_name or (log.request.employee_name if log.request else "System")
        
        # Convert UTC timestamp to local time (Asia/Kolkata as per settings)
        local_time = timezone.localtime(log.timestamp)
        
        log_list.append({
            "id": log.id,
            "requestCode": req_code,
            "employeeName": emp_name,
            "actorName": log.actor_name,
            "actorRole": log.actor_role,
            "actionType": log.action_type,
            "description": log.description,
            "timestamp": local_time.strftime("%d %b %Y %H:%M:%S")
        })
    return JsonResponse({"changelogs": log_list})

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
            req_code = record.request_code
            emp_name = record.employee_name
            workflow_stages = {"manager_review", "hod_review", "infra_admin_review", "infra_executive_review", "hr_review"}
            if record.stage in workflow_stages:
                return JsonResponse({"message": "Stop the request first, then delete it."}, status=400)

            # A request can only be deleted after the related user account has been removed.
            from django.contrib.auth.models import User
            from django.db.models import Q
            user = User.objects.filter(Q(email=record.personal_email) | Q(email=record.official_email)).first()
            if user:
                return JsonResponse({"message": "Delete the linked user account first before deleting this request."}, status=400)

            actor_id = payload.get("actorId")
            if actor_id:
                log_change(
                    actor_id,
                    "Request Deleted",
                    f"Permanently deleted request {req_code} for {emp_name}",
                )

            record.delete()
            return JsonResponse({"ok": True, "message": "Stopped onboarding request deleted permanently."})
    except OnboardingRequest.DoesNotExist:
        return JsonResponse({"message": "Request not found."}, status=404)
    except Exception as exc:
        return JsonResponse({"message": "An internal server error occurred."}, status=500)
