from django.apps import AppConfig


class WSConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "plane.ws"
    label = "plane_ws"
    verbose_name = "WebSocket"

