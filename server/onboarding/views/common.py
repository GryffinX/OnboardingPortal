from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db.models import Q
from ..models import Department, SoftwareCatalogItem
from .utils import validate_generic_input
from .changelog import log_change


def health_check(request):
    return JsonResponse({"status": "ok"})


def get_department_software_lists(dept_name):
    query = SoftwareCatalogItem.objects.filter(is_active=True)
    dept_filter = query.none()
    if dept_name:
        dept_filter = query.filter(department__name__iexact=dept_name)
    global_filter = query.filter(department__isnull=True)

    merged_items = []
    seen = set()
    preinstalled = []
    employee_installed = []

    for item in list(global_filter.order_by("sort_order", "name").values("name", "category")) + list(dept_filter.order_by("sort_order", "name").values("name", "category")):
        key = (item["name"], item["category"])
        if key in seen:
            continue
        seen.add(key)
        merged_items.append(item)

    for item in merged_items:
        if item["category"] == SoftwareCatalogItem.CATEGORY_EMPLOYEE:
            if item["name"] not in employee_installed:
                employee_installed.append(item["name"])
        else:
            if item["name"] not in preinstalled:
                preinstalled.append(item["name"])

    return {
        "preInstalledSoftware": preinstalled,
        "employeeInstalledSoftware": employee_installed,
    }


@csrf_exempt
@require_http_methods(["GET"])
def get_departments(request):
    depts = Department.objects.all().values_list('name', flat=True)
    return JsonResponse({"departments": list(depts)})


@csrf_exempt
@require_http_methods(["GET"])
def get_software_catalog(request):
    items = SoftwareCatalogItem.objects.all().select_related('department')
    catalog = {}
    
    # Structure: { "Global": { "preinstalled": [], "employee": [] }, "IT": { ... } }
    for item in items:
        dept_name = item.department.name if item.department else "Global Software"
        if dept_name not in catalog:
            catalog[dept_name] = {"preinstalled": [], "employee": []}
        
        catalog[dept_name][item.category].append(item.name)
        
    return JsonResponse({"catalog": catalog})


@csrf_exempt
@require_http_methods(["GET"])
def get_workflow_options(request):
    dept_name = request.GET.get("department")
    department_lists = get_department_software_lists(dept_name)

    return JsonResponse(
        {
            "officialEmailDomain": settings.OFFICIAL_DOMAIN,
            "preInstalledSoftware": department_lists["preInstalledSoftware"],
            "employeeInstalledSoftware": department_lists["employeeInstalledSoftware"],
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
        dept_name = str(payload.get("department", "")).strip()

        err = validate_generic_input(name, "Software Name")
        if err:
            return JsonResponse({"message": err}, status=400)

        if category not in (SoftwareCatalogItem.CATEGORY_PREINSTALLED, SoftwareCatalogItem.CATEGORY_EMPLOYEE):
            return JsonResponse({"message": "Invalid category"}, status=400)

        dept_obj = None
        if dept_name:
            dept_obj = Department.objects.filter(name__iexact=dept_name).first()
            if not dept_obj:
                return JsonResponse({"message": f"Department '{dept_name}' not found"}, status=404)

        existing = SoftwareCatalogItem.objects.filter(name__iexact=name, category=category, department=dept_obj).first()
        if existing:
            return JsonResponse({"message": "Software item already exists for this department/category"}, status=409)

        item = SoftwareCatalogItem(name=name, category=category, department=dept_obj, is_active=True)
        item.full_clean()
        item.save()

        actor_id = payload.get("actorId")
        if actor_id:
            target = f"dept '{dept_name}'" if dept_name else "global"
            log_change(
                actor_id,
                "Software Created",
                f"Added '{item.name}' to {item.category} catalog for {target}",
            )

        return JsonResponse({"ok": True, "item": {"name": item.name, "category": item.category, "department": dept_name}}, status=201)
    except ValidationError as e:
        return JsonResponse({"message": " ".join(e.messages) if hasattr(e, "messages") else str(e)}, status=400)
    except Exception as exc:
        return JsonResponse({"message": "Unable to create software item", "error": str(exc)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def delete_software_item(request):
    try:
        import json
        payload = json.loads(request.body.decode("utf-8") or "{}")
        name = str(payload.get("name", "")).strip()
        category = str(payload.get("category", "")).strip()
        dept_name = str(payload.get("department", "")).strip()

        if not name or not category:
            return JsonResponse({"message": "Missing name or category"}, status=400)

        dept_obj = None
        if dept_name:
            dept_obj = Department.objects.filter(name__iexact=dept_name).first()

        item = SoftwareCatalogItem.objects.filter(name=name, category=category, department=dept_obj).first()
        if not item:
            return JsonResponse({"message": "Software item not found"}, status=404)

        item_name = item.name
        item.delete()

        actor_id = payload.get("actorId")
        if actor_id:
            target = f"dept '{dept_name}'" if dept_name else "global"
            log_change(actor_id, "Software Deleted", f"Removed '{item_name}' from {category} catalog for {target}")

        return JsonResponse({"ok": True, "message": "Software item deleted successfully."})
    except Exception as exc:
        return JsonResponse({"message": "Unable to delete software item", "error": str(exc)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def update_software_item(request):
    try:
        import json
        payload = json.loads(request.body.decode("utf-8") or "{}")
        original_name = str(payload.get("originalName", "")).strip()
        original_category = str(payload.get("originalCategory", "")).strip()
        original_dept = str(payload.get("originalDepartment", "")).strip()
        
        new_name = str(payload.get("newName", "")).strip()
        new_category = str(payload.get("newCategory", "")).strip()
        new_dept = str(payload.get("newDepartment", "")).strip()

        if not original_name or not new_name:
            return JsonResponse({"message": "Missing software name"}, status=400)

        err = validate_generic_input(new_name, "Software Name")
        if err: return JsonResponse({"message": err}, status=400)

        orig_dept_obj = Department.objects.filter(name__iexact=original_dept).first() if original_dept else None
        item = SoftwareCatalogItem.objects.filter(name=original_name, category=original_category, department=orig_dept_obj).first()
        
        if not item:
            return JsonResponse({"message": "Software item not found"}, status=404)

        new_dept_obj = Department.objects.filter(name__iexact=new_dept).first() if new_dept else None
        if new_dept and not new_dept_obj:
             return JsonResponse({"message": f"Department '{new_dept}' not found"}, status=404)

        if new_name != original_name or new_category != original_category or new_dept != original_dept:
            if SoftwareCatalogItem.objects.filter(name=new_name, category=new_category, department=new_dept_obj).exclude(id=item.id).exists():
                return JsonResponse({"message": "Another item with this name already exists in this category/department"}, status=409)

        item.name = new_name
        item.category = new_category
        item.department = new_dept_obj
        item.full_clean()
        item.save()

        actor_id = payload.get("actorId")
        if actor_id:
            changes = []
            if original_name != new_name:
                changes.append(f"Name: '{original_name}' → '{new_name}'")
            if original_category != new_category:
                changes.append(f"Category: '{original_category}' → '{new_category}'")
            if original_dept != new_dept:
                changes.append(f"Dept: '{original_dept or 'global'}' → '{new_dept or 'global'}'")
            desc = "; ".join(changes) if changes else f"Updated software item '{new_name}'"
            log_change(actor_id, "Software Updated", desc)

        return JsonResponse({"ok": True, "message": "Software item updated successfully."})
    except ValidationError as e:
        return JsonResponse({"message": " ".join(e.messages) if hasattr(e, "messages") else str(e)}, status=400)
    except Exception as exc:
        return JsonResponse({"message": "Unable to update software item", "error": str(exc)}, status=500)


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

        actor_id = payload.get("actorId")
        if actor_id:
            log_change(
                actor_id,
                "Department Updated",
                f"Renamed department '{original_name}' → '{new_name}'",
            )

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

        actor_id = payload.get("actorId")
        if actor_id:
            log_change(actor_id, "Department Deleted", f"Removed department '{name}'")

        return JsonResponse({"ok": True, "message": "Department deleted successfully."})
    except Exception as exc:
        return JsonResponse({"message": "Unable to delete department", "error": "An internal server error occurred."}, status=500)
