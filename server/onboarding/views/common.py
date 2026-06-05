from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from ..models import Department, SoftwareCatalogItem


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

        if not name:
            return JsonResponse({"message": "Missing software name"}, status=400)

        if category not in (SoftwareCatalogItem.CATEGORY_PREINSTALLED, SoftwareCatalogItem.CATEGORY_EMPLOYEE):
            return JsonResponse({"message": "Invalid category"}, status=400)

        existing = SoftwareCatalogItem.objects.filter(name__iexact=name).first()
        if existing:
            return JsonResponse({"message": "Software item already exists", "item": {"name": existing.name, "category": existing.category}}, status=409)

        item = SoftwareCatalogItem.objects.create(name=name, category=category, is_active=True)

        return JsonResponse({"ok": True, "item": {"name": item.name, "category": item.category}}, status=201)
    except Exception as exc:
        return JsonResponse({"message": "Unable to create software item", "error": str(exc)}, status=500)
