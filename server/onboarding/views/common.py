from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from ..models import Department


def health_check(request):
    return JsonResponse({"status": "ok"})


@csrf_exempt
@require_http_methods(["GET"])
def get_departments(request):
    depts = Department.objects.all().values_list('name', flat=True)
    return JsonResponse({"departments": list(depts)})
