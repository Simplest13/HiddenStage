"""Realtime Event Bus & Webhook Dispatcher for HiddenStage.

Provides in-memory publish/subscribe for Server-Sent Events (SSE)
and asynchronous non-blocking webhook delivery.
"""

from __future__ import annotations

import json
import logging
import queue
import threading
from typing import Any
import urllib.request

logger = logging.getLogger(__name__)


class RealtimeEventBus:
    """Thread-safe event pub/sub bus partitioned by user_id."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._user_channels: dict[str, set[queue.Queue[dict[str, Any]]]] = {}
        self._broadcast_channels: set[queue.Queue[dict[str, Any]]] = set()

    def subscribe(self, user_id: str | None = None) -> queue.Queue[dict[str, Any]]:
        """Register an event queue for a user or broadcast listener."""
        q: queue.Queue[dict[str, Any]] = queue.Queue(maxsize=100)
        with self._lock:
            if user_id:
                uid = str(user_id)
                if uid not in self._user_channels:
                    self._user_channels[uid] = set()
                self._user_channels[uid].add(q)
            else:
                self._broadcast_channels.add(q)
        return q

    def unsubscribe(self, q: queue.Queue[dict[str, Any]], user_id: str | None = None) -> None:
        """Unregister an event queue upon connection close."""
        with self._lock:
            if user_id:
                uid = str(user_id)
                if uid in self._user_channels:
                    self._user_channels[uid].discard(q)
                    if not self._user_channels[uid]:
                        del self._user_channels[uid]
            else:
                self._broadcast_channels.discard(q)

    def publish_to_user(self, user_id: str, event_type: str, data: dict[str, Any]) -> None:
        """Publish an event to a specific user's active streams."""
        uid = str(user_id)
        payload = {"type": event_type, "data": data}
        with self._lock:
            queues = list(self._user_channels.get(uid, set()))
        for q in queues:
            try:
                q.put_nowait(payload)
            except queue.Full:
                logger.debug("Realtime queue full for user %s, dropping event %s", uid, event_type)

    def publish_broadcast(self, event_type: str, data: dict[str, Any]) -> None:
        """Publish an event to all connected listeners."""
        payload = {"type": event_type, "data": data}
        with self._lock:
            all_queues = list(self._broadcast_channels)
            for user_queues in self._user_channels.values():
                all_queues.extend(user_queues)
        for q in all_queues:
            try:
                q.put_nowait(payload)
            except queue.Full:
                pass


# Global singleton event bus
event_bus = RealtimeEventBus()


def dispatch_async_webhook(url: str, event_type: str, payload: dict[str, Any], secret: str = "") -> None:
    """Send an HTTP POST webhook asynchronously in a background thread."""
    if not url:
        return

    def _send() -> None:
        try:
            body = json.dumps({"event": event_type, "payload": payload}).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "HiddenStage-Webhook/1.0",
                    "X-HiddenStage-Event": event_type,
                    "X-HiddenStage-Secret": secret,
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                logger.debug("Webhook delivered to %s: status %d", url, resp.status)
        except Exception as exc:
            logger.warning("Webhook delivery failed to %s: %s", url, exc)

    thread = threading.Thread(target=_send, daemon=True, name=f"webhook-{event_type}")
    thread.start()
