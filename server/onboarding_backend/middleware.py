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

        request_origin = request.headers.get("Origin", "")
        allowed_origin = "*"

        if request_origin and request_origin in getattr(settings, "CORS_ALLOWED_ORIGINS", []):
            allowed_origin = request_origin

        response["Access-Control-Allow-Origin"] = allowed_origin
        response["Access-Control-Allow-Headers"] = "Content-Type"
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"

        if allowed_origin != "*":
            response["Vary"] = "Origin"

        return response
