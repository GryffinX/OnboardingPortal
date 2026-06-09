from onboarding.models import UserProfile
from django.contrib.auth.models import User

profiles = UserProfile.objects.filter(phone_number__isnull=True)
count = 1
for p in profiles:
    # Ensuring unique numbers for the unique constraint
    p.phone_number = f"000000000{count}"[-10:]
    p.save()
    print(f"Updated {p.user.username} to {p.phone_number}")
    count += 1
