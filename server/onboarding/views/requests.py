import json
import re
from datetime import datetime

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ..models import OnboardingRequest


DATE_LABEL_FORMAT = "%d %b %Y"


def _parse_software_list(value):
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]

    if not value:
        return []

    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if str(item).strip()]
    except (TypeError, json.JSONDecodeError):
        pass

    return [item.strip() for item in str(value).split(",") if item.strip()]


def _dump_software_list(items):
    return json.dumps(_parse_software_list(items))


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


def serialize_request(record):
    return {
        "id": _request_numeric_id(record.request_code, record.id),
        "requestCode": record.request_code,
        "formData": {
            "name": record.employee_name,
            "personalEmail": record.personal_email,
            "officialEmailUser": (record.official_email or "").split("@")[0],
            "department": record.department,
            "lineManager": record.line_manager,
            "hod": record.hod,
        },
        "officialEmail": record.official_email or "",
        "stage": record.stage,
        "submittedAt": _format_date(record.submitted_at),
        "lastUpdated": _format_date(record.last_updated),
        "additionalSoftware": [],
        "managerSoftware": _parse_software_list(record.manager_software),
        "hodSoftware": [],
        "preInstalledSoftware": _parse_software_list(record.pre_installed_software),
        "employeeInstalledSoftware": _parse_software_list(record.employee_installed_software),
        "assetCode": record.asset_code,
        "hodComment": record.hod_comment,
        "stopReason": record.stop_reason,
        "reviewRequestedBy": record.review_requested_by,
        "reviewReason": record.review_reason,
        "revisionCount": record.revision_count,
        "managerApprovedAt": record.manager_approved_at,
        "hodApprovedAt": record.hod_approved_at,
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

    request_code = (payload.get("requestCode") or "").strip()
    form_data = payload.get("formData") or {}

    if not request_code:
        return JsonResponse({"message": "requestCode is required."}, status=400)

    employee_name = (form_data.get("name") or "").strip()
    personal_email = (form_data.get("personalEmail") or "").strip()

    if not employee_name or not personal_email:
        return JsonResponse({"message": "Employee name and personal email are required."}, status=400)

    defaults = {
        "employee_name": employee_name,
        "personal_email": personal_email,
        "official_email": (payload.get("officialEmail") or "").strip() or None,
        "department": (form_data.get("department") or "").strip(),
        "line_manager": (form_data.get("lineManager") or "").strip(),
        "hod": (form_data.get("hod") or "").strip(),
        "stage": (payload.get("stage") or "manager_review").strip(),
        "pre_installed_software": _dump_software_list(payload.get("preInstalledSoftware")),
        "employee_installed_software": _dump_software_list(payload.get("employeeInstalledSoftware")),
        "manager_software": _dump_software_list(payload.get("managerSoftware")),
        "asset_code": (payload.get("assetCode") or "").strip(),
        "hod_comment": (payload.get("hodComment") or "").strip(),
        "stop_reason": (payload.get("stopReason") or payload.get("reviewReason") or "").strip(),
        "review_requested_by": (payload.get("reviewRequestedBy") or "").strip(),
        "review_reason": (payload.get("reviewReason") or "").strip(),
        "revision_count": int(payload.get("revisionCount") or 0),
        "manager_approved_at": (payload.get("managerApprovedAt") or "").strip(),
        "hod_approved_at": (payload.get("hodApprovedAt") or "").strip(),
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
