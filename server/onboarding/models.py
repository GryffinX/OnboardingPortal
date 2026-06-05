from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
import datetime

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
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=50, db_index=True) # Admin, Manager, HOD, Employee
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"


class SoftwareCatalogItem(models.Model):
    CATEGORY_PREINSTALLED = "preinstalled"
    CATEGORY_EMPLOYEE = "employee"

    CATEGORY_CHOICES = [
        (CATEGORY_PREINSTALLED, "Pre-installed"),
        (CATEGORY_EMPLOYEE, "Employee-installed"),
    ]

    name = models.CharField(max_length=150)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(fields=["name", "category"], name="unique_software_catalog_item_per_category"),
        ]

    def __str__(self):
        return f"{self.name} ({self.category})"

class OnboardingRequest(models.Model):
    request_code = models.CharField(max_length=20, unique=True)
    employee_name = models.CharField(max_length=255)
    personal_email = models.EmailField(db_index=True)
    official_email = models.EmailField(blank=True, null=True)
    department = models.CharField(max_length=100)
    line_manager = models.CharField(max_length=255)
    hod = models.CharField(max_length=255)
    
    stage = models.CharField(max_length=50, default="manager_review")
    submitted_at = models.DateField(auto_now_add=True)
    last_updated = models.DateField(auto_now=True)
    
    # Store software lists as JSON or comma-separated strings
    # Using simple text fields for now for simplicity, but JSONField is better for production
    pre_installed_software = models.TextField(blank=True)
    employee_installed_software = models.TextField(blank=True)
    manager_software = models.TextField(blank=True)
    asset_code = models.CharField(max_length=100, blank=True)
    hod_comment = models.TextField(blank=True)
    stop_reason = models.TextField(blank=True)
    
    review_requested_by = models.CharField(max_length=50, blank=True)
    review_reason = models.TextField(blank=True)
    revision_count = models.IntegerField(default=0)
    
    manager_approved_at = models.CharField(max_length=50, blank=True)
    hod_approved_at = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"{self.request_code} - {self.employee_name}"
