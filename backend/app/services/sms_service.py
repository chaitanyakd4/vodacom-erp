"""
sms_service.py - Multi-provider SMS & WhatsApp notification service.

Supports:
1. Meta WhatsApp Cloud API (Official Meta / Facebook Developer Platform) - 1,000 free conversations/month
2. UltraMsg Direct WhatsApp Gateway (https://ultramsg.com)
3. GreenAPI WhatsApp Gateway (https://green-api.com)
4. Twilio SMS & WhatsApp Business API
5. Console Simulation (Fallback if no credentials set)
"""
import logging
import httpx
import urllib.parse
from datetime import datetime, timezone, timedelta
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Indian Standard Time (IST, UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30), name="IST")


def get_current_ist_time() -> datetime:
    """Returns the current timestamp accurately in Indian Standard Time (IST, UTC+5:30)."""
    return datetime.now(IST)


def format_ist_time(dt: datetime = None) -> str:
    """Format datetime in accurate Indian Standard Time (e.g. '07-Sep-2026 02:35 PM IST')."""
    if dt is None:
        dt = datetime.now(IST)
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc).astimezone(IST)
    else:
        dt = dt.astimezone(IST)
    return dt.strftime("%d-%b-%Y %I:%M %p IST")


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


def _send_meta_whatsapp(phone_number_id: str, access_token: str, to_mobile: str, message: str, version: str = "v20.0") -> bool:
    """Send official direct WhatsApp message via Meta WhatsApp Cloud API."""
    try:
        clean_num = to_mobile.lstrip("+").replace(" ", "").replace("-", "")
        url = f"https://graph.facebook.com/{version}/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_num,
            "type": "text",
            "text": {
                "preview_url": True,
                "body": message
            }
        }
        res = httpx.post(url, json=payload, headers=headers, timeout=12.0)
        if res.status_code in (200, 201):
            data = res.json()
            if "messages" in data and len(data["messages"]) > 0:
                logger.info(f"[Meta WhatsApp] Sent to {clean_num}: ID={data['messages'][0].get('id')}")
                return True
        logger.warning(f"[Meta WhatsApp] HTTP {res.status_code}: {res.text}")
    except Exception as e:
        logger.error(f"[Meta WhatsApp] Failed to send: {e}")
    return False


def _send_ultramsg_whatsapp(instance_id: str, token: str, to_mobile: str, message: str) -> bool:
    """Send direct WhatsApp message via UltraMsg (https://ultramsg.com)."""
    try:
        url = f"https://api.ultramsg.com/{instance_id}/messages/chat"
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
    """Dispatch WhatsApp message using available provider: Meta Cloud API -> UltraMsg -> GreenAPI -> Twilio."""
    # 1. Meta WhatsApp Cloud API (Official, 1,000 free conversations/month)
    if getattr(settings, "META_WA_PHONE_NUMBER_ID", None) and getattr(settings, "META_WA_ACCESS_TOKEN", None):
        version = getattr(settings, "META_WA_API_VERSION", "v20.0")
        if _send_meta_whatsapp(settings.META_WA_PHONE_NUMBER_ID, settings.META_WA_ACCESS_TOKEN, to_mobile, message, version):
            return True

    # 2. UltraMsg Gateway
    if settings.ULTRAMSG_INSTANCE_ID and settings.ULTRAMSG_TOKEN:
        if _send_ultramsg_whatsapp(settings.ULTRAMSG_INSTANCE_ID, settings.ULTRAMSG_TOKEN, to_mobile, message):
            return True

    # 3. GreenAPI Gateway
    if settings.GREENAPI_INSTANCE_ID and settings.GREENAPI_API_TOKEN:
        if _send_greenapi_whatsapp(settings.GREENAPI_INSTANCE_ID, settings.GREENAPI_API_TOKEN, to_mobile, message):
            return True

    # 4. Twilio WhatsApp
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
    person_on_duty: str = "",
    customer_address: str = "",
    customer_contact: str = "",
    customer_phone: str = "",
    site_lat: float = None,
    site_lng: float = None
) -> dict:
    """
    Send WhatsApp and/or SMS alert to the technician's designated mobile number
    with Google Maps location and 1-tap checkin link.
    """
    settings = get_settings()

    if not to_number:
        logger.info("[NOTIFY] No technician mobile number provided — skipping notification.")
        return {"sms": False, "whatsapp": False}

    to_mobile = _normalise_mobile(to_number)
    ticket_ref = f"SW-{str(ticket_id).zfill(4)}"
    action_label = "ASSIGNED" if action == "created" else "UPDATED"
    dispatched_time = format_ist_time()

    # Build Google Maps navigation link
    maps_link = ""
    if site_lat and site_lng:
        maps_link = f"https://www.google.com/maps/dir/?api=1&destination={site_lat},{site_lng}"
    elif customer_address:
        encoded_addr = urllib.parse.quote_plus(customer_address)
        maps_link = f"https://www.google.com/maps/search/?api=1&query={encoded_addr}"

    maps_section = f"📍 *Google Maps Location:*\n{maps_link}\n" if maps_link else ""
    contact_section = f"👤 *Site Contact:* {customer_contact} ({customer_phone})\n" if customer_contact or customer_phone else ""
    address_section = f"🏢 *Site Address:* {customer_address}\n" if customer_address else ""
    checkin_link = f"https://erp.vodacom.in/service-work/{ticket_id}"

    message = (
        f"🔔 *Vodacom ERP — Service Work {action_label}*\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"🎫 *Ticket #:* {ticket_ref}\n"
        f"🏢 *Client:* {customer_name}\n"
        f"{contact_section}"
        f"{address_section}"
        f"📝 *Work:* {title}\n"
        f"⚡ *Priority:* {priority.upper()}\n"
        f"👤 *Assigned Engineer:* {person_on_duty or 'Technician'}\n"
        f"⏰ *Dispatched Time:* {dispatched_time}\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"{maps_section}"
        f"🔗 *1-Tap Site Check-In:*\n"
        f"{checkin_link}\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"Please tap the map link to navigate and mark your arrival upon reaching the site."
    )

    result = {"sms": False, "whatsapp": False}

    # Dispatch WhatsApp (Meta Cloud API / UltraMsg / GreenAPI / Twilio)
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
    Send an automated WhatsApp and/or SMS acknowledgment to the customer with accurate IST time.
    """
    settings = get_settings()

    if not to_number:
        return {"sms": False, "whatsapp": False}

    to_mobile = _normalise_mobile(to_number)
    ticket_ref = f"SW-{str(ticket_id).zfill(4)}"
    log_time = format_ist_time()

    message = (
        f"✅ *Vodacom Technologies — Service Ticket Confirmed*\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"Dear {customer_name},\n\n"
        f"Your service request has been logged successfully:\n"
        f"🎫 *Ticket #:* {ticket_ref}\n"
        f"📝 *Issue:* {title}\n"
        f"⚡ *Priority:* {priority.upper()}\n"
        f"👤 *Assigned Engineer:* {person_on_duty or 'Vodacom Support Team'}\n"
        f"⏰ *Logged Time:* {log_time}\n"
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


def send_technician_reached_notification(
    ticket_id: int,
    customer_name: str,
    title: str,
    person_on_duty: str,
    technician_mobile: str,
    reached_time_str: str = "",
    location_str: str = "",
    distance_warning: str = ""
) -> dict:
    """
    Send an instant WhatsApp & SMS alert to Admin/Supervisor when a technician marks 'Reached Site'.
    Guarantees accurate IST time and GPS verification links.
    """
    settings = get_settings()
    admin_mobile = settings.ADMIN_NOTIFY_MOBILE or settings.COMPANY_PHONE
    ticket_ref = f"SW-{str(ticket_id).zfill(4)}"

    if not reached_time_str:
        reached_time_str = format_ist_time()

    location_line = f"📍 *GPS Location Check-in:*\n{location_str}\n" if location_str else ""
    distance_line = f"📏 *Geofence Verification:*\n{distance_warning}\n" if distance_warning else ""

    message = (
        f"📍 *Vodacom ERP — Engineer Reached Site Check-In*\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"🎫 *Ticket #:* {ticket_ref}\n"
        f"🏢 *Client:* {customer_name}\n"
        f"📝 *Work:* {title}\n"
        f"👤 *Engineer:* {person_on_duty or 'Assigned Engineer'} ({technician_mobile or 'N/A'})\n"
        f"⏰ *Arrival Time:* {reached_time_str}\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"{location_line}"
        f"{distance_line}"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"The engineer has arrived on site and started attending to the client."
    )

    result = {"sms": False, "whatsapp": False}

    if admin_mobile:
        to_admin = _normalise_mobile(admin_mobile)
        result["whatsapp"] = _send_whatsapp_message(to_admin, message, settings)
        result["sms"] = _send_plain_sms(to_admin, message, settings)

    if not result["whatsapp"] and not result["sms"]:
        logger.info(f"[SIMULATED SITE CHECK-IN ALERT] To: {admin_mobile or 'ADMIN'}\n{message}")
        print(f"\n{'='*60}\nSIMULATED SITE CHECK-IN ALERT → {admin_mobile or 'ADMIN'}\n{message}\n{'='*60}\n")

    return result
