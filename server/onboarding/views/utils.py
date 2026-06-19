import re
import random
import string
from django.conf import settings
from django.core.mail import EmailMessage

PERSONAL_EMAIL_REGEX = r"^[a-zA-Z0-9.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9-]+$"
OFFICIAL_EMAIL_USER_REGEX = r"^[a-zA-Z0-9.-]+$"


def normalize_role(role):
    if not isinstance(role, str):
        return "Employee"

    canonical_roles = {
        "admin": "Admin",
        "manager": "Manager",
        "hod": "HOD",
        "infrastructure admin": "Infrastructure Admin",
        "infrastructure executive": "Infrastructure Executive",
        "employee": "Employee",
    }

    return canonical_roles.get(role.strip().lower(), "Employee")


def resolve_user_role_and_department(user):
    from ..models import UserProfile
    role = "Admin" if user.is_staff or user.is_superuser else "Employee"
    department_name = ""
    phone_number = ""
    employee_code = ""
    is_active = user.is_active

    try:
        profile = user.profile
        role = normalize_role(profile.role or role)
        department_name = profile.department.name if profile.department else ""
        phone_number = profile.phone_number
        employee_code = profile.employee_code
    except UserProfile.DoesNotExist:
        pass

    return role, department_name, phone_number, employee_code, is_active


def validate_name(name):
    if not name: return "Name is required."
    if name.startswith(" ") or name.endswith(" "): return "Name cannot start or end with a space."
    if "  " in name: return "Name cannot contain double spaces."
    if not re.match(r"^[a-zA-Z ]+$", name): return "Name can only contain letters and spaces."
    if len(name) < 3 or len(name) > 50: return "Name must be between 3 and 50 characters."
    return None

def validate_phone(phone):
    if not phone: return "Phone number is required."
    if not phone.isdigit(): return "Phone number must contain only digits."
    if len(phone) != 10: return "Phone number must be exactly 10 digits."
    return None

def validate_gibberish(value):
    if not value: return None
    alnum_count = len(re.findall(r'[a-zA-Z0-9]', value))
    if alnum_count < 1:
        return "Input contains invalid or gibberish text. Please use more alphanumeric characters."
    if len(value) > 3 and (alnum_count / len(value)) < 0.4:
        return "Input contains invalid or gibberish text. Please use more alphanumeric characters."
    if re.search(r'([a-zA-Z0-9])\1{3,}', value):
        return "Input contains invalid or gibberish text (repeating characters)."
    mashes = {"asdf", "qwer", "zxcv", "qwe", "asd", "zxc", "wef", "sdf", "xcv", "ert", "dfg", "cvb", "rty", "fgh", "vbn", "tyu", "ghj", "bnm", "hjkl", "uiop"}
    words = re.split(r'[\s,.:;!?]+', value.lower())
    for word in words:
        if word in mashes:
            return f"Input contains invalid or gibberish text ('{word}' is not allowed)."
    return None

def validate_generic_input(value, field_name):
    if not value: return f"{field_name} is required."
    if value.startswith(" ") or value.endswith(" "): return f"{field_name} cannot start or end with a space."
    if "  " in value: return f"{field_name} cannot contain double spaces."
    if re.search(r"[%:;\"'<>(){}[\]|\\~`^!*+?]", value):
        return f"{field_name} contains restricted special characters."
    if len(value) < 2: return f"{field_name} must be at least 2 characters long."
    gib_err = validate_gibberish(value)
    if gib_err: return gib_err
    return None

def sanitize_for_email(value):
    if not value: return ""
    # Remove restricted characters: %:;"'<>(){}[]|\~`^!*+?
    return re.sub(r"[%:;\"'<>(){}[\]|\\~`^!*+?]", "", str(value))


def validate_payload(payload):
    errors = {}

    name = payload.get("name") or ""
    personal_email = (payload.get("personalEmail") or "").strip()
    official_email_user = (payload.get("officialEmailUser") or "").strip()
    employee_phone_number = (payload.get("employeePhoneNumber") or "").strip()
    department = (payload.get("department") or "").strip()
    line_manager = (payload.get("lineManager") or "").strip()
    hod = (payload.get("hod") or "").strip()

    name_err = validate_name(name)
    if name_err: errors["name"] = name_err

    phone_err = validate_phone(employee_phone_number)
    if phone_err: errors["employeePhoneNumber"] = phone_err

    # Personal Email validation
    if not personal_email:
        errors["personalEmail"] = "Personal email is required."
    elif len(personal_email) > 100:
        errors["personalEmail"] = "Personal email must be less than 100 characters."
    elif not re.match(PERSONAL_EMAIL_REGEX, personal_email):
        errors["personalEmail"] = "Enter a valid personal email address."

    # Official Email User validation
    if not official_email_user:
        errors["officialEmail"] = "Official email username is required."
    elif not re.match(OFFICIAL_EMAIL_USER_REGEX, official_email_user):
        errors["officialEmail"] = "Enter a valid official email username."

    dept_err = validate_generic_input(department, "Department")
    if dept_err: errors["department"] = dept_err

    lm_err = validate_generic_input(line_manager, "Line Manager")
    if lm_err: errors["lineManager"] = lm_err

    hod_err = validate_generic_input(hod, "HOD")
    if hod_err: errors["hod"] = hod_err

    return errors

def validate_employee_code(code):
    if not code: return "Employee code is required."
    if not code.isdigit(): return "Employee code must contain only digits."
    if len(code) != 5: return "Employee code must be exactly 5 digits."
    return None

def validate_user_payload(payload):
    errors = {}
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip()
    phone = (payload.get("phoneNumber") or "").strip()
    employee_code = (payload.get("employeeCode") or "").strip()
    password = (payload.get("password") or "").strip()

    name_err = validate_name(name)
    if name_err: errors["name"] = name_err

    if not email or not re.match(PERSONAL_EMAIL_REGEX, email):
        errors["email"] = "Enter a valid email address."
    
    phone_err = validate_phone(phone)
    if phone_err: errors["phoneNumber"] = phone_err
    
    if employee_code:
        code_err = validate_employee_code(employee_code)
        if code_err: errors["employeeCode"] = code_err
    
    if password and len(password) < 8:
        errors["password"] = "Password must be at least 8 characters long."
    
    return errors


def get_user_email_by_name(name):
    if not name: return None
    from django.contrib.auth.models import User
    from django.db.models import Q
    user = User.objects.filter(Q(first_name__icontains=name) | Q(last_name__icontains=name)).first()
    return user.email if user else None

def get_emails_by_role(role_name, department_name=None):
    from django.contrib.auth.models import User
    from ..models import UserProfile
    
    query = UserProfile.objects.filter(role=role_name, user__is_active=True)
    if department_name:
        query = query.filter(department__name=department_name)
    
    return list(query.values_list('user__email', flat=True))

def send_workflow_notification(request_record, next_stage):
    """
    Sends notification to the next person in the workflow chain.
    """
    recipients = []
    subject = f"Action Required: Onboarding Request {request_record.request_code}"
    
    if next_stage == "manager_review":
        email = get_user_email_by_name(request_record.line_manager)
        if email: recipients.append(email)
        role_label = "Line Manager"
    elif next_stage == "hod_review":
        email = get_user_email_by_name(request_record.hod)
        if email: recipients.append(email)
        role_label = "HOD"
    elif next_stage == "infra_admin_review":
        # Notify all Infrastructure Admins
        recipients = get_emails_by_role("Infrastructure Admin", "Infrastructure")
        role_label = "Infrastructure Admin"
    elif next_stage == "infra_executive_review":
        # Notify the specific assigned Executive
        if request_record.infra_executive:
            recipients.append(request_record.infra_executive.email)
        role_label = "Infrastructure Executive"
    else:
        return # No notification for other stages here

    if not recipients:
        # Fallback to test recipient if no specific user found
        recipients = [settings.TEST_RECIPIENT]

    body = "\n".join([
        f"Dear {role_label},",
        "",
        f"An onboarding request for {request_record.employee_name} is now pending at your stage: {next_stage.replace('_', ' ').title()}.",
        "",
        "--- REQUEST SUMMARY ---",
        f"Request Code: {request_record.request_code}",
        f"Employee Name: {request_record.employee_name}",
        f"Department: {request_record.department}",
        f"Line Manager: {request_record.line_manager}",
        f"HOD: {request_record.hod}",
        "",
        "Please log in to the Onboarding Portal to review and take action.",
        "",
        "Regards,",
        "Onboarding Workflow System"
    ])

    try:
        message = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.EMAIL_HOST_USER,
            to=recipients,
        )
        message.send(fail_silently=False)
    except Exception as e:
        print(f"Workflow mail failed: {e}")

def build_message(payload):
    official_email = f"{payload['officialEmailUser'].strip()}{settings.OFFICIAL_DOMAIN}"
    recipient = settings.TEST_RECIPIENT

    message = EmailMessage(
        subject=f"A new Onboarding Form Submitted on the Portal",
        body="\n".join(
            [
                "A new onboarding form has been submitted successfully. You are requested to review the same.",
                "",
                f"Employee Name: {sanitize_for_email(payload['name'].strip())}",
                f"Employee Phone Number: {sanitize_for_email(payload['employeePhoneNumber'].strip())}",
                f"Entered Personal Email: {sanitize_for_email(payload['personalEmail'].strip())}",
                f"Proposed Official Email: {sanitize_for_email(official_email)}",
                f"Department: {sanitize_for_email(payload['department'].strip())}",
                f"Line Manager: {sanitize_for_email(payload['lineManager'].strip())}",
                f"HOD: {sanitize_for_email(payload['hod'].strip())}",
            ]
        ),
        from_email=settings.EMAIL_HOST_USER,
        to=[recipient],
    )

    return message, official_email


def generate_otp():
    return "".join(random.choices(string.digits, k=6))


def parse_software_list(value):
    import json
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


def dump_software_list(items):
    import json
    return json.dumps(parse_software_list(items))

DATE_LABEL_FORMAT = "%d %b %Y"

def _format_date(date_value):
    if not date_value:
        return ""
    return date_value.strftime(DATE_LABEL_FORMAT)

def _get_employee_code_by_name(name):
    if not name: return ""
    from django.contrib.auth.models import User
    from django.db.models import Q
    from ..models import UserProfile
    user = User.objects.filter(Q(first_name__icontains=name) | Q(last_name__icontains=name)).first()
    if user:
        try:
            return user.profile.employee_code or ""
        except UserProfile.DoesNotExist:
            pass
    return ""

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
    from .common import get_department_software_lists
    department_lists = get_department_software_lists(record.department)
    
    subject_code = record.employee_code or ""
    if not subject_code:
        from ..models import UserProfile
        from django.contrib.auth.models import User
        from django.db.models import Q
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
        
        # Soft Delete Fields
        "isDeleted": record.is_deleted,
        "deletedAt": _format_date(record.deleted_at),
        "deletedBy": record.deleted_by.username if record.deleted_by else None,
        "deleteReason": record.delete_reason,

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

import jwt
import datetime
from django.http import JsonResponse
from functools import wraps

def generate_jwt(user):
    payload = {
        'user_id': user.id,
        'email': user.email,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

def jwt_required(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'message': 'Authentication credentials were not provided.'}, status=401)
        
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            email = payload.get('email')
            if not user_id or not email:
                return JsonResponse({'message': 'Invalid token payload.'}, status=401)
            request.user_id = user_id
            request.user_email = email
        except jwt.ExpiredSignatureError:
            return JsonResponse({'message': 'Signature has expired.'}, status=401)
        except jwt.InvalidTokenError:
            return JsonResponse({'message': 'Invalid token.'}, status=401)
            
        return view_func(request, *args, **kwargs)
    return _wrapped_view

def admin_required(view_func):
    @wraps(view_func)
    @jwt_required
    def _wrapped_view(request, *args, **kwargs):
        from django.contrib.auth.models import User
        try:
            user = User.objects.get(id=request.user_id)
            role, _, _, _, _ = resolve_user_role_and_department(user)
            if role != "Admin":
                return JsonResponse({'message': 'You do not have permission to perform this action.'}, status=403)
        except User.DoesNotExist:
            return JsonResponse({'message': 'User not found.'}, status=404)
        return view_func(request, *args, **kwargs)
    return _wrapped_view
