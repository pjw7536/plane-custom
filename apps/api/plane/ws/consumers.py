import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer


class IssueConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.project_id = self.scope["url_route"]["kwargs"]["project_id"]
        self.project_group_name = f"project_{self.project_id}"
        await self.channel_layer.group_add(self.project_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.project_group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # Currently not handling inbound messages from clients
        pass

    async def issue_update(self, event):
        payload = event.get("payload")
        if payload is None:
            return
        await self.send_json(content=payload)
