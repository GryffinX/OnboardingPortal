from django.conf import settings
from django.http import HttpResponse


class SimpleCORSMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        allowed_origin = settings.CORS_ALLOWED_ORIGIN
        response["Access-Control-Allow-Origin"] = allowed_origin
        response["Access-Control-Allow-Headers"] = "Content-Type"
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"

        if allowed_origin != "*":
            response["Vary"] = "Origin"

        return response
