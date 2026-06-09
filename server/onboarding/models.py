from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
import datetime
import re

def validate_generic_text(value):
    if not value: return
    if value.startswith(" ") or value.endswith(" "):
        raise ValidationError("Value cannot start or end with a space.")
    if "  " in value:
        raise ValidationError("Value cannot contain double spaces.")
    if re.search(r"[%:;\"'<>(){}[\]|\\~`^!*+?]", value):
        raise ValidationError("Value contains restricted special characters.")

def validate_comment_text(value):
    if not value: return
    validate_generic_text(value)
    if len(value) < 10 or len(value) > 500:
        raise ValidationError("Comment/Reason must be between 10 and 500 characters.")

def validate_employee_name(value):
    validate_generic_text(value)
    if not re.match(r"^[a-zA-Z ]+$", value):
        raise ValidationError("Name can only contain letters and spaces.")
    if len(value) < 3 or len(value) > 50:
        raise ValidationError("Name must be between 3 and 50 characters.")

def validate_phone_number(value):
    if not value:
        raise ValidationError("Phone number is required.")
    if not value.isdigit():
        raise ValidationError("Phone number must contain only digits.")
    if len(value) != 10:
        raise ValidationError("Phone number must be exactly 10 digits.")

class PasswordResetOTP(models.Model):
    email = models.EmailField(db_index=True)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    def is_valid(self):
        # OTP valid for 10 minutes
        return self.created_at >= timezone.now() - datetime.timedelta(minutes=10)

    def __str__(self):
        return f"OTP for {self.email} - {self.otp}"

class Department(models.Model):
    name = models.CharField(max_length=100, unique=True, validators=[validate_generic_text])

    def clean(self):
        validate_generic_text(self.name)

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=50, db_index=True) # Admin, Manager, HOD, Employee
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    phone_number = models.CharField(max_length=10, unique=True, validators=[validate_phone_number])
    employee_code = models.CharField(max_length=50, unique=True, null=True, blank=True, validators=[validate_generic_text])

    def clean(self):
        if self.phone_number:
            validate_phone_number(self.phone_number)
        if self.employee_code:
            validate_generic_text(self.employee_code)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} - {self.role}"


class SoftwareCatalogItem(models.Model):
    CATEGORY_PREINSTALLED = "preinstalled"
    CATEGORY_EMPLOYEE = "employee"

    CATEGORY_CHOICES = [
        (CATEGORY_PREINSTALLED, "Pre-installed"),
        (CATEGORY_EMPLOYEE, "Employee-installed"),
    ]

    name = models.CharField(max_length=150, validators=[validate_generic_text])
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(fields=["name", "category"], name="unique_software_catalog_item_per_category"),
        ]

    def clean(self):
        validate_generic_text(self.name)

    def __str__(self):
        return f"{self.name} ({self.category})"

class OnboardingRequest(models.Model):
    request_code = models.CharField(max_length=20, unique=True)
    employee_name = models.CharField(max_length=50, validators=[validate_employee_name])
    employee_phone_number = models.CharField(max_length=10, unique=True, validators=[validate_phone_number])
    personal_email = models.EmailField(db_index=True, unique=True)
    official_email = models.EmailField(blank=True, default="")
    department = models.CharField(max_length=100, validators=[validate_generic_text])
    line_manager = models.CharField(max_length=50, validators=[validate_employee_name])
    hod = models.CharField(max_length=50, validators=[validate_employee_name])
    
    stage = models.CharField(max_length=50, default="manager_review")
    submitted_at = models.DateField(auto_now_add=True)
    last_updated = models.DateField(auto_now=True)
    
    pre_installed_software = models.TextField(blank=True)
    employee_installed_software = models.TextField(blank=True)
    manager_software = models.TextField(blank=True)
    asset_code = models.CharField(max_length=100, blank=True, validators=[validate_generic_text])
    employee_code = models.CharField(max_length=50, blank=True, validators=[validate_generic_text])
    hod_comment = models.TextField(blank=True, validators=[validate_comment_text])
    stop_reason = models.TextField(blank=True, validators=[validate_comment_text])
    
    review_requested_by = models.CharField(max_length=50, blank=True, validators=[validate_generic_text])
    review_reason = models.TextField(blank=True, validators=[validate_comment_text])
    revision_count = models.IntegerField(default=0)
    
    manager_approved_at = models.CharField(max_length=50, blank=True)
    hod_approved_at = models.CharField(max_length=50, blank=True)

    def clean(self):
        validate_employee_name(self.employee_name)
        if self.employee_phone_number:
            validate_phone_number(self.employee_phone_number)
        validate_generic_text(self.department)
        validate_generic_text(self.line_manager)
        validate_generic_text(self.hod)
        if self.asset_code: validate_generic_text(self.asset_code)
        if self.hod_comment: validate_comment_text(self.hod_comment)
        if self.stop_reason: validate_comment_text(self.stop_reason)
        if self.review_requested_by: validate_generic_text(self.review_requested_by)
        if self.review_reason: validate_comment_text(self.review_reason)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.request_code} - {self.employee_name}"
