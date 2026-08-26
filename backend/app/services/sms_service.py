"""
sms_service.py - Multi-provider SMS & WhatsApp notification service.

Supports:
1. UltraMsg Direct WhatsApp Gateway (https://ultramsg.com) - Flat pricing, unlimited messages
2. GreenAPI WhatsApp Gateway (https://green-api.com)
3. Twilio SMS & WhatsApp Business API
4. Console Simulation (Fallback if no credentials set)
"""
import logging
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _normalise_mobile(mobile: str) -> str:
    """Ensure the mobile number starts with +91 (India) if no country code provided."""
    if not mobile:
        return ""
    mobile = mobile.strip().replace(" ", "").replace("-", "")
    if not mobile.startswith("+"):
        # Default: India (+91)
        mobile = "+91" + mobile.lstrip("0")
    return mobile


def _normalise_whatsapp_from(number: str) -> str:
    if not number:
        return ""
    number = number.strip()
    if not number.startswith("whatsapp:"):
        return f"whatsapp:{number}"
    return number


def _send_ultramsg_whatsapp(instance_id: str, token: str, to_mobile: str, message: str) -> bool:
    """Send direct WhatsApp message via UltraMsg (https://ultramsg.com)."""
    try:
        url = f"https://api.ultramsg.com/{instance_id}/messages/chat"
        # UltraMsg accepts mobile with or without + (e.g. +919876543210)
        payload = {
            "token": token,
            "to": to_mobile,
            "body": message
        }
        res = httpx.post(url, data=payload, timeout=12.0)
        if res.status_code == 200:
            data = res.json()
            if data.get("sent") == "true" or "id" in data:
                logger.info(f"[UltraMsg WhatsApp] Sent to {to_mobile}: ID={data.get('id')}")
                return True
            else:
                logger.warning(f"[UltraMsg WhatsApp] Response error: {data}")
        else:
            logger.warning(f"[UltraMsg WhatsApp] HTTP {res.status_code}: {res.text}")
    except Exception as e:
        logger.error(f"[UltraMsg WhatsApp] Failed to send: {e}")
    return False


def _send_greenapi_whatsapp(instance_id: str, api_token: str, to_mobile: str, message: str) -> bool:
    """Send direct WhatsApp message via GreenAPI (https://green-api.com)."""
    try:
        clean_num = to_mobile.lstrip("+")
        chat_id = f"{clean_num}@c.us"
        url = f"https://api.green-api.com/waInstance{instance_id}/sendMessage/{api_token}"
        payload = {
            "chatId": chat_id,
            "message": message
        }
        res = httpx.post(url, json=payload, timeout=12.0)
        if res.status_code == 200:
            data = res.json()
            if "idMessage" in data:
                logger.info(f"[GreenAPI WhatsApp] Sent to {chat_id}: ID={data.get('idMessage')}")
                return True
        logger.warning(f"[GreenAPI WhatsApp] HTTP {res.status_code}: {res.text}")
    except Exception as e:
        logger.error(f"[GreenAPI WhatsApp] Failed to send: {e}")
    return False


def _send_whatsapp_message(to_mobile: str, message: str, settings) -> bool:
    """Dispatch WhatsApp message using available provider: UltraMsg -> GreenAPI -> Twilio."""
    # 1. UltraMsg Gateway (Recommended / Lowest Cost)
    if settings.ULTRAMSG_INSTANCE_ID and settings.ULTRAMSG_TOKEN:
        if _send_ultramsg_whatsapp(settings.ULTRAMSG_INSTANCE_ID, settings.ULTRAMSG_TOKEN, to_mobile, message):
            return True

    # 2. GreenAPI Gateway
    if settings.GREENAPI_INSTANCE_ID and settings.GREENAPI_API_TOKEN:
        if _send_greenapi_whatsapp(settings.GREENAPI_INSTANCE_ID, settings.GREENAPI_API_TOKEN, to_mobile, message):
            return True

    # 3. Twilio WhatsApp
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_WHATSAPP_FROM:
        try:
            from twilio.rest import Client  # type: ignore
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            wa_from = _normalise_whatsapp_from(settings.TWILIO_WHATSAPP_FROM)
            wa_to = f"whatsapp:{to_mobile}"
            wa = client.messages.create(body=message, from_=wa_from, to=wa_to)
            logger.info(f"[Twilio WhatsApp] Sent to {wa_to}: SID={wa.sid}")
            return True
        except Exception as twilio_err:
            logger.warning(f"[Twilio WhatsApp] Error: {twilio_err}")

    return False


def _send_plain_sms(to_mobile: str, message: str, settings) -> bool:
    """Send standard SMS via Twilio if configured."""
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER:
        try:
            from twilio.rest import Client  # type: ignore
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            sms = client.messages.create(body=message, from_=settings.TWILIO_FROM_NUMBER, to=to_mobile)
            logger.info(f"[Twilio SMS] Sent to {to_mobile}: SID={sms.sid}")
            return True
        except Exception as sms_err:
            logger.warning(f"[Twilio SMS] Error: {sms_err}")
    return False


def send_ticket_notification(
    to_number: str,
    ticket_id: int,
    customer_name: str,
    title: str,
    priority: str,
    action: str = "created",   # "created" | "updated"
    person_on_duty: str = ""
) -> dict:
    """
    Send WhatsApp and/or SMS alert to the technician's designated mobile number.
    """
    settings = get_settings()

    if not to_number:
        logger.info("[NOTIFY] No technician mobile number provided — skipping notification.")
        return {"sms": False, "whatsapp": False}

    to_mobile = _normalise_mobile(to_number)
    ticket_ref = f"SW-{str(ticket_id).zfill(4)}"
    action_label = "CREATED" if action == "created" else "UPDATED"

    message = (
        f"🔔 *Vodacom ERP — Service Ticket {action_label}*\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"🎫 *Ticket #:* {ticket_ref}\n"
        f"🏢 *Client:* {customer_name}\n"
        f"📝 *Issue:* {title}\n"
        f"⚡ *Priority:* {priority.upper()}\n"
        f"👤 *Assigned To:* {person_on_duty or 'Technician'}\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"Please attend to this service work promptly."
    )

    result = {"sms": False, "whatsapp": False}

    # Dispatch WhatsApp (UltraMsg / GreenAPI / Twilio)
    result["whatsapp"] = _send_whatsapp_message(to_mobile, message, settings)

    # Dispatch SMS (Twilio)
    result["sms"] = _send_plain_sms(to_mobile, message, settings)

    # Simulation fallback if no live credentials set
    if not result["whatsapp"] and not result["sms"]:
        logger.info(f"[SIMULATED NOTIFICATION] To: {to_mobile}\n{message}")
        print(f"\n{'='*60}\nSIMULATED NOTIFICATION → {to_mobile}\n{message}\n{'='*60}\n")

    return result


def send_customer_ticket_ack(
    to_number: str,
    ticket_id: int,
    customer_name: str,
    title: str,
    priority: str,
    person_on_duty: str = ""
) -> dict:
    """
    Send an automated WhatsApp and/or SMS acknowledgment to the customer.
    """
    settings = get_settings()

    if not to_number:
        return {"sms": False, "whatsapp": False}

    to_mobile = _normalise_mobile(to_number)
    ticket_ref = f"SW-{str(ticket_id).zfill(4)}"

    message = (
        f"✅ *Vodacom Technologies — Service Ticket Confirmed*\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"Dear {customer_name},\n\n"
        f"Your service request has been logged successfully:\n"
        f"🎫 *Ticket #:* {ticket_ref}\n"
        f"📝 *Issue:* {title}\n"
        f"⚡ *Priority:* {priority.upper()}\n"
        f"👤 *Assigned Engineer:* {person_on_duty or 'Vodacom Support Team'}\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"Our support engineer will contact you shortly."
    )

    result = {"sms": False, "whatsapp": False}
    result["whatsapp"] = _send_whatsapp_message(to_mobile, message, settings)
    result["sms"] = _send_plain_sms(to_mobile, message, settings)

    if not result["whatsapp"] and not result["sms"]:
        logger.info(f"[SIMULATED CUSTOMER ACK] To: {to_mobile}\n{message}")
        print(f"\n{'='*60}\nSIMULATED CUSTOMER ACK → {to_mobile}\n{message}\n{'='*60}\n")

    return result


