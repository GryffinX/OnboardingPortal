from django.contrib import admin
from .models import PasswordResetOTP

@admin.register(PasswordResetOTP)
class PasswordResetOTPAdmin(admin.ModelAdmin):
    list_display = ("email", "otp", "created_at", "is_verified")
    search_fields = ("email",)
    list_filter = ("is_verified", "created_at")
