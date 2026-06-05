import re
import random
import string
from django.conf import settings
from django.core.mail import EmailMessage

PERSONAL_EMAIL_REGEX = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
OFFICIAL_EMAIL_USER_REGEX = r"^[a-zA-Z0-9._]+$"


def validate_payload(payload):
    errors = {}

    name = (payload.get("name") or "").strip()
    personal_email = (payload.get("personalEmail") or "").strip()
    official_email_user = (payload.get("officialEmailUser") or "").strip()
    department = (payload.get("department") or "").strip()
    line_manager = (payload.get("lineManager") or "").strip()
    hod = (payload.get("hod") or "").strip()

    if not name:
        errors["name"] = "Employee name is required."

    if not personal_email or not re.match(PERSONAL_EMAIL_REGEX, personal_email):
        errors["personalEmail"] = "Enter a valid personal email address."

    if not official_email_user or not re.match(OFFICIAL_EMAIL_USER_REGEX, official_email_user):
        errors["officialEmail"] = "Enter a valid official email username."

    if not department:
        errors["department"] = "Select a line department."

    if not line_manager:
        errors["lineManager"] = "Select a line manager."

    if not hod:
        errors["hod"] = "Select an HOD."

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
