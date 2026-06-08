from django.contrib.auth.models import User
from onboarding.models import UserProfile, OnboardingRequest

profiles = UserProfile.objects.all().order_by('id')
current_code = 1000

for p in profiles:
    code = str(current_code)
    p.employee_code = code
    p.save()
    req = OnboardingRequest.objects.filter(personal_email=p.user.email).first()
    if req:
        req.employee_code = code
        req.save()
    print(f"Updated {p.user.email} to {code}")
    current_code += 1

print("Successfully seeded new employee codes.")
