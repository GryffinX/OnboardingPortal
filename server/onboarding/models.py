from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
import datetime

class PasswordResetOTP(models.Model):
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    def is_valid(self):
        # OTP valid for 10 minutes
        return self.created_at >= timezone.now() - datetime.timedelta(minutes=10)

    def __str__(self):
        return f"OTP for {self.email} - {self.otp}"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=50) # Admin, Manager, HOD, HR, Employee

    def __str__(self):
        return f"{self.user.username} - {self.role}"
