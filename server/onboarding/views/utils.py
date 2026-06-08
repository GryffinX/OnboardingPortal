import re
import random
import string
from django.conf import settings
from django.core.mail import EmailMessage

PERSONAL_EMAIL_REGEX = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
OFFICIAL_EMAIL_USER_REGEX = r"^[a-zA-Z0-9._]+$"


def normalize_role(role):
    if not isinstance(role, str):
        return "Employee"

    canonical_roles = {
        "admin": "Admin",
        "manager": "Manager",
        "hod": "HOD",
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

def validate_generic_input(value, field_name):
    if not value: return f"{field_name} is required."
    if value.startswith(" ") or value.endswith(" "): return f"{field_name} cannot start or end with a space."
    if "  " in value: return f"{field_name} cannot contain double spaces."
    return None

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
    
    if phone:
        phone_err = validate_phone(phone)
        if phone_err: errors["phoneNumber"] = phone_err
    
    if employee_code:
        code_err = validate_generic_input(employee_code, "Employee Code")
        if code_err: errors["employeeCode"] = code_err
    
    if password and len(password) < 8:
        errors["password"] = "Password must be at least 8 characters long."
    
    return errors


def build_message(payload):
    official_email = f"{payload['officialEmailUser'].strip()}{settings.OFFICIAL_DOMAIN}"
    recipient = settings.TEST_RECIPIENT

    message = EmailMessage(
        subject=f"A new Onboarding Form Submitted on the Portal",
        body="\n".join(
            [
                "A new onboarding form has been submitted successfully. You are requested to review the same.",
                "",
                f"Employee Name: {payload['name'].strip()}",
                f"Employee Phone Number: {payload['employeePhoneNumber'].strip()}",
                f"Entered Personal Email: {payload['personalEmail'].strip()}",
                f"Proposed Official Email: {official_email}",
                f"Department: {payload['department'].strip()}",
                f"Line Manager: {payload['lineManager'].strip()}",
                f"HOD: {payload['hod'].strip()}",
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
