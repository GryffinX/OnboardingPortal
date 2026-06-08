from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from onboarding.models import Department, SoftwareCatalogItem, UserProfile

class Command(BaseCommand):
    help = "Seed the database with initial data (departments, software, etc.)"

    def handle(self, *args, **options):
        # 1. Seed Departments
        departments = ["HR", "IT", "Finance", "Operations", "Sales", "Marketing", "Legal"]
        for dept_name in departments:
            Department.objects.get_or_create(name=dept_name)
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(departments)} departments."))

        # 2. Seed Software Catalog Items
        pre_installed = [
            "Windows 11 Pro",
            "Microsoft Office 365",
            "Slack",
            "Zoom",
            "Cisco AnyConnect VPN",
            "SentinelOne Antivirus",
        ]
        employee_installed = [
            "VS Code",
            "Node.js",
            "Python 3.10",
            "Docker Desktop",
            "Postman",
            "Google Chrome",
        ]

        for name in pre_installed:
            SoftwareCatalogItem.objects.get_or_create(
                name=name, 
                category=SoftwareCatalogItem.CATEGORY_PREINSTALLED
            )
        
        for name in employee_installed:
            SoftwareCatalogItem.objects.get_or_create(
                name=name, 
                category=SoftwareCatalogItem.CATEGORY_EMPLOYEE
            )
        
        self.stdout.write(self.style.SUCCESS("Seeded Software Catalog."))

        # 3. Ensure an Admin user exists
        if not User.objects.filter(username="admin@securitas-india.com").exists():
            admin = User.objects.create_superuser(
                username="admin@securitas-india.com",
                email="admin@securitas-india.com",
                password="adminpassword123",
                first_name="Portal",
                last_name="Administrator"
            )
            dept_hr = Department.objects.get(name="HR")
            UserProfile.objects.create(user=admin, role="Admin", department=dept_hr)
            self.stdout.write(self.style.SUCCESS("Created admin user: admin@securitas-india.com / adminpassword123"))
        
        self.stdout.write(self.style.SUCCESS("Database seeding completed successfully."))
