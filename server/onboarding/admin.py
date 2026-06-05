from django.contrib import admin
from .models import PasswordResetOTP, UserProfile, Department, SoftwareCatalogItem

@admin.register(PasswordResetOTP)
class PasswordResetOTPAdmin(admin.ModelAdmin):
    list_display = ("email", "otp", "created_at", "is_verified")
    search_fields = ("email",)
    list_filter = ("is_verified", "created_at")

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "get_department")
    list_filter = ("role", "department")
    search_fields = ("user__username", "user__email")

    def get_department(self, obj):
        return obj.department.name if obj.department else "-"
    get_department.short_description = 'Department'

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(SoftwareCatalogItem)
class SoftwareCatalogItemAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "is_active", "sort_order")
    list_filter = ("category", "is_active")
    search_fields = ("name",)
    ordering = ("category", "sort_order", "name")
