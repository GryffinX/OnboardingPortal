from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.core.exceptions import ValidationError
from ..models import Department, SoftwareCatalogItem
from .utils import validate_generic_input


def health_check(request):
    return JsonResponse({"status": "ok"})


@csrf_exempt
@require_http_methods(["GET"])
def get_departments(request):
    depts = Department.objects.all().values_list('name', flat=True)
    return JsonResponse({"departments": list(depts)})


@csrf_exempt
@require_http_methods(["GET"])
def get_workflow_options(request):
    catalog_items = SoftwareCatalogItem.objects.filter(is_active=True).values(
        "name",
        "category",
        "sort_order",
    )

    preinstalled = []
    employee_installed = []

    for item in catalog_items:
        if item["category"] == SoftwareCatalogItem.CATEGORY_EMPLOYEE:
            employee_installed.append(item["name"])
        else:
            preinstalled.append(item["name"])

    return JsonResponse(
        {
            "officialEmailDomain": settings.OFFICIAL_DOMAIN,
            "preInstalledSoftware": preinstalled,
            "employeeInstalledSoftware": employee_installed,
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def create_software_item(request):
    try:
        import json
        payload = json.loads(request.body.decode("utf-8") or "{}")
        name = str(payload.get("name", "")).strip()
        category = str(payload.get("category", "")).strip()

        err = validate_generic_input(name, "Software Name")
        if err:
            return JsonResponse({"message": err}, status=400)

        if category not in (SoftwareCatalogItem.CATEGORY_PREINSTALLED, SoftwareCatalogItem.CATEGORY_EMPLOYEE):
            return JsonResponse({"message": "Invalid category"}, status=400)

        existing = SoftwareCatalogItem.objects.filter(name__iexact=name).first()
        if existing:
            return JsonResponse({"message": "Software item already exists", "item": {"name": existing.name, "category": existing.category}}, status=409)

        item = SoftwareCatalogItem(name=name, category=category, is_active=True)
        item.full_clean()
        item.save()

        return JsonResponse({"ok": True, "item": {"name": item.name, "category": item.category}}, status=201)
    except ValidationError as e:
        return JsonResponse({"message": " ".join(e.messages) if hasattr(e, "messages") else str(e)}, status=400)
    except Exception as exc:
        return JsonResponse({"message": "Unable to create software item", "error": "An internal server error occurred."}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def delete_software_item(request):
    try:
        import json
        payload = json.loads(request.body.decode("utf-8") or "{}")
        name = str(payload.get("name", "")).strip()
        category = str(payload.get("category", "")).strip()

        if not name or not category:
            return JsonResponse({"message": "Missing name or category"}, status=400)

        item = SoftwareCatalogItem.objects.filter(name=name, category=category).first()
        if not item:
            return JsonResponse({"message": "Software item not found"}, status=404)

        item.delete()
        return JsonResponse({"ok": True, "message": "Software item deleted successfully."})
    except Exception as exc:
        return JsonResponse({"message": "Unable to delete software item", "error": "An internal server error occurred."}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def update_software_item(request):
    try:
        import json
        payload = json.loads(request.body.decode("utf-8") or "{}")
        original_name = str(payload.get("originalName", "")).strip()
        original_category = str(payload.get("originalCategory", "")).strip()
        new_name = str(payload.get("newName", "")).strip()
        new_category = str(payload.get("newCategory", "")).strip()

        if not original_name or not new_name:
            return JsonResponse({"message": "Missing software name"}, status=400)

        err = validate_generic_input(new_name, "Software Name")
        if err: return JsonResponse({"message": err}, status=400)

        item = SoftwareCatalogItem.objects.filter(name=original_name, category=original_category).first()
        if not item:
            return JsonResponse({"message": "Software item not found"}, status=404)

        if new_name != original_name or new_category != original_category:
            if SoftwareCatalogItem.objects.filter(name=new_name, category=new_category).exclude(id=item.id).exists():
                return JsonResponse({"message": "Another item with this name already exists in this category"}, status=409)

        item.name = new_name
        item.category = new_category
        item.full_clean()
        item.save()

        return JsonResponse({"ok": True, "message": "Software item updated successfully."})
    except ValidationError as e:
        return JsonResponse({"message": " ".join(e.messages) if hasattr(e, "messages") else str(e)}, status=400)
    except Exception as exc:
        return JsonResponse({"message": "Unable to update software item", "error": "An internal server error occurred."}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def update_department(request):
    try:
        import json
        payload = json.loads(request.body.decode("utf-8") or "{}")
        original_name = str(payload.get("originalName", "")).strip()
        new_name = str(payload.get("newName", "")).strip()

        if not original_name or not new_name:
            return JsonResponse({"message": "Missing department name"}, status=400)

        err = validate_generic_input(new_name, "Department Name")
        if err: return JsonResponse({"message": err}, status=400)

        item = Department.objects.filter(name=original_name).first()
        if not item:
            return JsonResponse({"message": "Department not found"}, status=404)

        if new_name != original_name:
            if Department.objects.filter(name=new_name).exists():
                return JsonResponse({"message": "Department with this name already exists"}, status=409)

        item.name = new_name
        item.full_clean()
        item.save()

        return JsonResponse({"ok": True, "message": "Department updated successfully."})
    except ValidationError as e:
        return JsonResponse({"message": " ".join(e.messages) if hasattr(e, "messages") else str(e)}, status=400)
    except Exception as exc:
        return JsonResponse({"message": "Unable to update department", "error": "An internal server error occurred."}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def delete_department(request):
    try:
        import json
        payload = json.loads(request.body.decode("utf-8") or "{}")
        name = str(payload.get("name", "")).strip()

        if not name:
            return JsonResponse({"message": "Department name is required"}, status=400)

        item = Department.objects.filter(name=name).first()
        if not item:
            return JsonResponse({"message": "Department not found"}, status=404)

        item.delete()
        return JsonResponse({"ok": True, "message": "Department deleted successfully."})
    except Exception as exc:
        return JsonResponse({"message": "Unable to delete department", "error": "An internal server error occurred."}, status=500)
