from django.test import TestCase, Client
from django.contrib.auth.models import User
from onboarding.models import OnboardingRequest, Department, UserProfile, AssetInventory, SoftwareCatalogItem
from django.core import mail
import json

class CompleteOnboardingFlowTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.dept_it = Department.objects.create(name="IT")
        self.dept_infra = Department.objects.create(name="Infrastructure")
        self.dept_finance = Department.objects.create(name="Finance")

        SoftwareCatalogItem.objects.create(
            name="IT Base Image",
            category=SoftwareCatalogItem.CATEGORY_PREINSTALLED,
            department=self.dept_it,
        )
        SoftwareCatalogItem.objects.create(
            name="IT Dev Tools",
            category=SoftwareCatalogItem.CATEGORY_EMPLOYEE,
            department=self.dept_it,
        )
        SoftwareCatalogItem.objects.create(
            name="Finance Base Image",
            category=SoftwareCatalogItem.CATEGORY_PREINSTALLED,
            department=self.dept_finance,
        )
        SoftwareCatalogItem.objects.create(
            name="Finance Audit Tools",
            category=SoftwareCatalogItem.CATEGORY_EMPLOYEE,
            department=self.dept_finance,
        )
        
        # Admin User
        self.admin_user = User.objects.create_superuser(username="admin@test.com", email="admin@test.com", password="password")
        UserProfile.objects.create(user=self.admin_user, role="Admin", department=self.dept_it, phone_number="1234567890")
        
        # Manager User
        self.manager_user = User.objects.create_user(username="manager@test.com", email="manager@test.com", password="password", first_name="Manager One")
        UserProfile.objects.create(user=self.manager_user, role="Manager", department=self.dept_it, phone_number="1234567891")

        # HOD User
        self.hod_user = User.objects.create_user(username="hod@test.com", email="hod@test.com", password="password", first_name="HOD One")
        UserProfile.objects.create(user=self.hod_user, role="HOD", department=self.dept_it, phone_number="1234567892")

        # Infra Admin User
        self.ia_user = User.objects.create_user(username="ia@test.com", email="ia@test.com", password="password", first_name="Infra", last_name="Admin")
        UserProfile.objects.create(user=self.ia_user, role="Infrastructure Admin", department=self.dept_infra, phone_number="1234567893")
        
        # Infra Executive User
        self.ie_user = User.objects.create_user(username="ie@test.com", email="ie@test.com", password="password", first_name="Infra", last_name="Exec")
        UserProfile.objects.create(user=self.ie_user, role="Infrastructure Executive", department=self.dept_infra, phone_number="1234567894")

    def test_complete_onboarding_flow(self):
        # 1. HR Submission
        payload = {
            "name": "New Employee",
            "employeePhoneNumber": "9999999999",
            "personalEmail": "newemp@test.com",
            "officialEmailUser": "new.emp",
            "department": "IT",
            "lineManager": "Manager One",
            "hod": "HOD One"
        }
        
        response = self.client.post("/api/onboarding-email", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        
        req = OnboardingRequest.objects.get(personal_email="newemp@test.com")
        self.assertEqual(req.stage, "manager_review")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("manager@test.com", mail.outbox[0].to)
        self.assertEqual(json.loads(req.pre_installed_software), ["IT Base Image"])
        self.assertEqual(json.loads(req.employee_installed_software), ["IT Dev Tools"])
        mail.outbox.clear()

        # 2. Manager Review (Update software, approve to HOD)
        save_payload = {
            "id": req.id,
            "managerSoftware": ["VS Code", "Docker"],
            "dateOfJoining": "2026-06-15",
            "stage": "hod_review"
        }
        response = self.client.post("/api/save-request", data=json.dumps(save_payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        
        req.refresh_from_db()
        self.assertEqual(req.stage, "hod_review")
        self.assertIn("VS Code", req.manager_software)
        self.assertEqual(req.date_of_joining, "2026-06-15")
        
        # Ensure mail sent to HOD
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("hod@test.com", mail.outbox[0].to)
        mail.outbox.clear()

        # 3. HOD Review (Approve to Infra Admin)
        save_payload = {
            "id": req.id,
            "hodComment": "Approved for joining.",
            "stage": "infra_admin_review"
        }
        response = self.client.post("/api/save-request", data=json.dumps(save_payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        
        req.refresh_from_db()
        self.assertEqual(req.stage, "infra_admin_review")
        self.assertEqual(req.hod_comment, "Approved for joining.")
        
        # Ensure mail sent to Infra Admin
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("ia@test.com", mail.outbox[0].to)
        mail.outbox.clear()

        # 4. Infra Admin Review (Assign Exec, approve to Infra Exec)
        save_payload = {
            "id": req.id,
            "infraAdminComment": "Please setup a standard dev laptop.",
            "infraExecutive": self.ie_user.id,
            "stage": "infra_executive_review"
        }
        response = self.client.post("/api/save-request", data=json.dumps(save_payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        
        req.refresh_from_db()
        self.assertEqual(req.stage, "infra_executive_review")
        self.assertEqual(req.infra_admin_comment, "Please setup a standard dev laptop.")
        self.assertEqual(req.infra_executive.id, self.ie_user.id)
        
        # Ensure mail sent to Infra Exec
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("ie@test.com", mail.outbox[0].to)
        mail.outbox.clear()

        # Create Asset Inventory
        asset = AssetInventory.objects.create(
            asset_code="AST-100",
            laptop_model="ThinkPad",
            laptop_processor="i7",
            laptop_ram="16GB",
            laptop_storage="512GB",
            laptop_gpu="RTX 3050"
        )

        # 5. Infra Exec Review (Assign Asset)
        save_payload = {
            "id": req.id,
            "assetCode": "AST-100",
            "laptopModel": "ThinkPad",
            "laptopProcessor": "i7",
            "laptopRam": "16GB",
            "laptopStorage": "512GB",
            "laptopGpu": "RTX 3050",
            "stage": "approved"
        }
        response = self.client.post("/api/save-request", data=json.dumps(save_payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        
        req.refresh_from_db()
        self.assertEqual(req.stage, "approved")
        self.assertEqual(req.asset_code, "AST-100")
        self.assertEqual(req.laptop_gpu, "RTX 3050")
        
        asset.refresh_from_db()
        self.assertTrue(asset.is_assigned)

        # 6. Finalize Onboarding (Create User)
        finalize_payload = {
            "requestCode": req.request_code,
            "name": "New Employee",
            "email": "new.emp@company.com", # Official Email
            "department": "IT"
        }
        response = self.client.post("/api/finalize-onboarding", data=json.dumps(finalize_payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        
        # Check User creation
        new_user = User.objects.get(email="new.emp@company.com")
        self.assertIsNotNone(new_user)
        self.assertTrue(new_user.is_active)
        
        req.refresh_from_db()
        self.assertEqual(req.official_email, "new.emp@company.com")
        
        # Check Welcome Email to personal email
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("newemp@test.com", mail.outbox[0].to)
        self.assertIn("Welcome to the Team", mail.outbox[0].subject)
        mail.outbox.clear()

    def test_department_change_refreshes_software_lists(self):
        req = OnboardingRequest.objects.create(
            request_code="ONB-CHANGE-DEPT",
            employee_name="Department Switch",
            personal_email="switch@test.com",
            employee_phone_number="1234500000",
            department="IT",
            line_manager="Manager One",
            hod="HOD One",
            stage="manager_review",
            pre_installed_software=json.dumps(["IT Base Image"]),
            employee_installed_software=json.dumps(["IT Dev Tools"]),
        )

        response = self.client.post(
            "/api/save-request",
            data=json.dumps({
                "id": req.id,
                "formData": {
                    "name": "Department Switch",
                    "employeePhoneNumber": "1234500000",
                    "personalEmail": "switch@test.com",
                    "officialEmailUser": "switch.user",
                    "department": "Finance",
                    "lineManager": "Manager One",
                    "hod": "HOD One",
                },
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

        req.refresh_from_db()
        self.assertEqual(req.department, "Finance")
        self.assertEqual(json.loads(req.pre_installed_software), ["Finance Base Image"])
        self.assertEqual(json.loads(req.employee_installed_software), ["Finance Audit Tools"])
        
    def test_hr_review_stop_case(self):
        # Create request at manager stage
        req = OnboardingRequest.objects.create(
            request_code="ONB-TEST-HR",
            employee_name="Test HR",
            personal_email="hr@test.com",
            employee_phone_number="1234567890",
            department="IT",
            line_manager="Manager One",
            hod="HOD One",
            stage="manager_review"
        )
        
        # Send to HR
        save_payload = {
            "id": req.id,
            "stage": "hr",
            "reviewReason": "Need more info"
        }
        response = self.client.post("/api/save-request", data=json.dumps(save_payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        
        req.refresh_from_db()
        self.assertEqual(req.stage, "hr")
        self.assertEqual(req.review_reason, "Need more info")
        
        # Stop Case
        save_payload = {
            "id": req.id,
            "stage": "stopped",
            "stopReason": "Candidate declined"
        }
        response = self.client.post("/api/save-request", data=json.dumps(save_payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        
        req.refresh_from_db()
        self.assertEqual(req.stage, "stopped")
        self.assertEqual(req.stop_reason, "Candidate declined")
        self.assertEqual(req.personal_email, f"deleted_{req.id}@stopped.local")
        
    def test_asset_inventory_management(self):
        # Create Asset
        payload = {
            "assetCode": "AST-NEW-01",
            "laptopModel": "MacBook",
            "laptopProcessor": "M2",
            "laptopRam": "32GB",
            "laptopStorage": "1TB",
            "laptopGpu": "Integrated"
        }
        response = self.client.post("/api/create-asset", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        
        asset = AssetInventory.objects.get(asset_code="AST-NEW-01")
        self.assertEqual(asset.laptop_model, "MacBook")
        
        # Update Asset
        update_payload = {
            "id": asset.id,
            "laptopModel": "MacBook Pro",
            "laptopGpu": "M2 Max"
        }
        response = self.client.post("/api/update-asset", data=json.dumps(update_payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        
        asset.refresh_from_db()
        self.assertEqual(asset.laptop_model, "MacBook Pro")
        self.assertEqual(asset.laptop_gpu, "M2 Max")
        
        # Delete Asset
        response = self.client.post("/api/delete-asset", data=json.dumps({"id": asset.id}), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(AssetInventory.objects.filter(asset_code="AST-NEW-01").exists())
