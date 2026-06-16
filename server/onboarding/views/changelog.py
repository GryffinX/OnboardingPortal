from django.contrib.auth.models import User

from ..models import ChangeLog
from .utils import normalize_role, parse_software_list


STAGE_LABELS = {
    "manager_review": "Manager Review",
    "hod_review": "HOD Review",
    "hr_review": "HR Review",
    "infra_admin_review": "Infra Admin Review",
    "infra_executive_review": "Infra Exec Review",
    "approved": "Approved",
    "stopped": "Stopped",
}


def format_stage(stage):
    if not stage:
        return "—"
    return STAGE_LABELS.get(stage, str(stage).replace("_", " ").title())


def get_actor(actor_id):
    if not actor_id:
        return None
    return User.objects.filter(id=actor_id).first()


def is_admin_user(user):
    if not user:
        return False
    if user.is_staff or user.is_superuser:
        return True
    try:
        return normalize_role(user.profile.role) == "Admin"
    except Exception:
        return False


def _actor_name(user):
    if not user:
        return ""
    return f"{user.first_name} {user.last_name}".strip() or user.username


def _actor_role(user):
    if not user:
        return ""
    try:
        return user.profile.role or ""
    except Exception:
        return "Admin" if user.is_staff or user.is_superuser else ""


def log_change(actor_id, action_type, description, request=None):
    actor = get_actor(actor_id)
    if not actor:
        return None

    request_code = ""
    employee_name = ""
    if request is not None:
        request_code = request.request_code or ""
        employee_name = request.employee_name or ""

    return ChangeLog.objects.create(
        request=request,
        request_code=request_code,
        employee_name=employee_name,
        actor=actor,
        actor_name=_actor_name(actor),
        actor_role=_actor_role(actor),
        action_type=action_type,
        description=description,
    )


def _user_label(user_id):
    if not user_id:
        return "—"
    user = User.objects.filter(id=user_id).first()
    if not user:
        return f"User #{user_id}"
    return _actor_name(user)


def snapshot_request(req):
    return {
        "stage": req.stage,
        "employee_name": req.employee_name,
        "employee_phone_number": req.employee_phone_number,
        "personal_email": req.personal_email,
        "official_email": req.official_email or "",
        "department": req.department,
        "line_manager": req.line_manager,
        "hod": req.hod,
        "manager_software": req.manager_software,
        "infra_software": getattr(req, "infra_software", "") or "",
        "asset_code": req.asset_code,
        "employee_code": req.employee_code,
        "hod_comment": req.hod_comment,
        "infra_admin_comment": req.infra_admin_comment,
        "infra_admin_id": req.infra_admin_id,
        "infra_executive_id": req.infra_executive_id,
        "laptop_model": req.laptop_model,
        "laptop_ram": req.laptop_ram,
        "laptop_storage": req.laptop_storage,
        "laptop_processor": req.laptop_processor,
        "laptop_gpu": req.laptop_gpu,
        "stop_reason": req.stop_reason,
        "review_reason": req.review_reason,
        "review_requested_by": req.review_requested_by,
        "date_of_joining": req.date_of_joining,
    }


def _add_change(changes, label, old, new):
    old_val = str(old or "").strip() or "—"
    new_val = str(new or "").strip() or "—"
    if old_val != new_val:
        changes.append(f"{label}: '{old_val}' → '{new_val}'")


def _software_label(value):
    items = parse_software_list(value)
    return ", ".join(items) if items else "—"


def describe_request_changes(before, req):
    changes = []

    _add_change(changes, "Stage", format_stage(before["stage"]), format_stage(req.stage))
    _add_change(changes, "Employee Name", before["employee_name"], req.employee_name)
    _add_change(changes, "Phone", before["employee_phone_number"], req.employee_phone_number)
    _add_change(changes, "Personal Email", before["personal_email"], req.personal_email)
    _add_change(changes, "Official Email", before["official_email"], req.official_email or "")
    _add_change(changes, "Department", before["department"], req.department)
    _add_change(changes, "Line Manager", before["line_manager"], req.line_manager)
    _add_change(changes, "HOD", before["hod"], req.hod)
    _add_change(changes, "Employee Code", before["employee_code"], req.employee_code)
    _add_change(changes, "Asset Code", before["asset_code"], req.asset_code)
    _add_change(changes, "Date of Joining", before["date_of_joining"], req.date_of_joining)

    old_manager_sw = _software_label(before["manager_software"])
    new_manager_sw = _software_label(req.manager_software)
    if old_manager_sw != new_manager_sw:
        changes.append(f"Manager Software: '{old_manager_sw}' → '{new_manager_sw}'")

    old_infra_sw = _software_label(before["infra_software"])
    new_infra_sw = _software_label(getattr(req, "infra_software", "") or "")
    if old_infra_sw != new_infra_sw:
        changes.append(f"Infra Software: '{old_infra_sw}' → '{new_infra_sw}'")

    _add_change(changes, "HOD Comment", before["hod_comment"], req.hod_comment)
    _add_change(changes, "Infra Admin Comment", before["infra_admin_comment"], req.infra_admin_comment)
    _add_change(changes, "Stop Reason", before["stop_reason"], req.stop_reason)
    _add_change(changes, "HR Review Reason", before["review_reason"], req.review_reason)
    _add_change(changes, "Review Requested By", before["review_requested_by"], req.review_requested_by)

    if before["infra_admin_id"] != req.infra_admin_id:
        changes.append(
            f"Infra Admin: '{_user_label(before['infra_admin_id'])}' → '{_user_label(req.infra_admin_id)}'"
        )
    if before["infra_executive_id"] != req.infra_executive_id:
        changes.append(
            f"Infra Executive: '{_user_label(before['infra_executive_id'])}' → '{_user_label(req.infra_executive_id)}'"
        )

    laptop_fields = [
        ("Laptop Model", "laptop_model"),
        ("Laptop RAM", "laptop_ram"),
        ("Laptop Storage", "laptop_storage"),
        ("Laptop Processor", "laptop_processor"),
        ("Laptop GPU", "laptop_gpu"),
    ]
    for label, key in laptop_fields:
        _add_change(changes, label, before[key], getattr(req, key))

    return "; ".join(changes) if changes else "No field changes detected"


def describe_user_changes(before, after):
    changes = []
    _add_change(changes, "Name", before.get("name"), after.get("name"))
    _add_change(changes, "Email", before.get("email"), after.get("email"))
    _add_change(changes, "Role", before.get("role"), after.get("role"))
    _add_change(changes, "Department", before.get("department"), after.get("department"))
    _add_change(changes, "Phone", before.get("phone"), after.get("phone"))
    _add_change(changes, "Employee Code", before.get("employee_code"), after.get("employee_code"))
    if before.get("is_active") != after.get("is_active"):
        old_status = "Active" if before.get("is_active") else "Inactive"
        new_status = "Active" if after.get("is_active") else "Inactive"
        changes.append(f"Status: '{old_status}' → '{new_status}'")
    if after.get("password_changed"):
        changes.append("Password updated")
    return "; ".join(changes) if changes else "Account details updated"
