from django.urls import path
from plane.ws.consumers import IssueConsumer


websocket_urlpatterns = [
    path("ws/projects/<uuid:project_id>/", IssueConsumer.as_asgi()),
]

