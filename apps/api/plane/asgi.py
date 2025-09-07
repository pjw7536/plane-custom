import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "plane.settings.production")

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

import plane.ws.routing


application = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "websocket": AuthMiddlewareStack(
            URLRouter(plane.ws.routing.websocket_urlpatterns)
        ),
    }
)
