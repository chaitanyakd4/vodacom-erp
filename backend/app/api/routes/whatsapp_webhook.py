"""
whatsapp_webhook.py - Public Meta WhatsApp Cloud API webhook.

Meta calls this endpoint (no ERP login) to:
  GET  -> verify the webhook (hub.challenge handshake)
  POST -> deliver message status updates (sent / delivered / read / failed)
          and incoming replies from customers / engineers.

Callback URL to enter in Meta:  https://erp.vodacom.in/api/whatsapp/webhook
Verify token:                   value of META_WA_VERIFY_TOKEN in backend/.env
"""
import hashlib
import hmac
import json
import logging
from collections import deque
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import PlainTextResponse

from app.core.config import get_settings
from app.core.security import get_current_user

logger = logging.getLogger("whatsapp_webhook")

router = APIRouter()

# Keep the most recent events in memory so admins can inspect delivery results
_recent_events: deque = deque(maxlen=200)


@router.get("/webhook")
def verify_webhook(request: Request):
    """Meta webhook verification handshake."""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge", "")

    expected = get_settings().META_WA_VERIFY_TOKEN
    if mode == "subscribe" and expected and token == expected:
        logger.info("[WA Webhook] Verified by Meta.")
        return PlainTextResponse(content=challenge, status_code=200)

    logger.warning("[WA Webhook] Verification failed (token mismatch).")
    raise HTTPException(status_code=403, detail="Verification token mismatch")


def _valid_signature(raw_body: bytes, signature_header: str, app_secret: str) -> bool:
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(app_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header.split("=", 1)[1])


@router.post("/webhook")
async def receive_webhook(request: Request):
    """Receive delivery statuses and incoming messages from Meta."""
    raw = await request.body()

    # Optional signature check (only when META_APP_SECRET is configured)
    app_secret = get_settings().META_APP_SECRET
    if app_secret and not _valid_signature(raw, request.headers.get("X-Hub-Signature-256", ""), app_secret):
        logger.warning("[WA Webhook] Invalid signature - payload ignored.")
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        payload = json.loads(raw or b"{}")
    except Exception:
        return {"status": "ignored"}

    now = datetime.now(timezone.utc).isoformat()
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {}) or {}

            for st in value.get("statuses", []) or []:
                errors = st.get("errors") or []
                err_txt = "; ".join(f"{e.get('code')}: {e.get('title') or e.get('message')}" for e in errors)
                event = {
                    "type": "status",
                    "received_at": now,
                    "message_id": st.get("id"),
                    "recipient": st.get("recipient_id"),
                    "status": st.get("status"),
                    "error": err_txt or None,
                }
                _recent_events.appendleft(event)
                if st.get("status") == "failed":
                    logger.warning(f"[WA Webhook] FAILED to {event['recipient']}: {err_txt}")
                else:
                    logger.info(f"[WA Webhook] {event['status']} -> {event['recipient']}")

            for msg in value.get("messages", []) or []:
                text = (msg.get("text") or {}).get("body") or msg.get("type")
                event = {
                    "type": "incoming",
                    "received_at": now,
                    "from": msg.get("from"),
                    "message_id": msg.get("id"),
                    "text": text,
                }
                _recent_events.appendleft(event)
                logger.info(f"[WA Webhook] Incoming from {event['from']}: {text}")

    # Always return 200 quickly so Meta does not retry
    return {"status": "received"}


@router.get("/events", dependencies=[Depends(get_current_user)])
def recent_events(limit: int = 50):
    """Logged-in users: view the latest WhatsApp delivery statuses / replies."""
    return list(_recent_events)[: max(1, min(limit, 200))]
