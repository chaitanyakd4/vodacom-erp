"""
sms_service.py - Twilio-based SMS and WhatsApp notification service.

If Twilio credentials are not configured, messages are simulated to the console.
"""
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _is_twilio_configured(settings) -> bool:
    return bool(
        settings.TWILIO_ACCOUNT_SID and
        settings.TWILIO_AUTH_TOKEN and
        settings.TWILIO_FROM_NUMBER
    )


def _normalise_whatsapp_from(number: str) -> str:
    if not number:
        return ""
    number = number.strip()
    if not number.startswith("whatsapp:"):
        return f"whatsapp:{number}"
    return number


def _normalise_mobile(mobile: str) -> str:
    """Ensure the mobile number starts with +91 (India) if no country code provided."""
    mobile = mobile.strip().replace(" ", "").replace("-", "")
    if not mobile.startswith("+"):
        # Default: India (+91)
        mobile = "+91" + mobile.lstrip("0")
    return mobile


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
    Send an SMS and/or WhatsApp message to the technician's mobile number
    informing them about a new or updated service ticket.

    Returns a dict with {"sms": bool, "whatsapp": bool}.
    Silently degrades if Twilio is not configured.
    """
    settings = get_settings()

    if not to_number:
        logger.info("[SMS] No technician mobile number provided — skipping notification.")
        return {"sms": False, "whatsapp": False}

    to_mobile = _normalise_mobile(to_number)
    ticket_ref = f"SW-{str(ticket_id).zfill(4)}"

    action_label = "CREATED" if action == "created" else "UPDATED"
    message = (
        f"[Vodacom ERP] Service Ticket {action_label}\n"
        f"Ticket: {ticket_ref}\n"
        f"Client: {customer_name}\n"
        f"Issue: {title}\n"
        f"Priority: {priority.upper()}\n"
        f"Assigned To: {person_on_duty or 'You'}\n"
        f"Please attend to this ticket at the earliest."
    )

    if not _is_twilio_configured(settings):
        logger.info(
            f"[SMS SIMULATED] To: {to_mobile}\n"
            f"Message:\n{message}\n"
            "(Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in .env to send real messages)"
        )
        print(f"\n{'='*60}")
        print(f"SIMULATED SMS/WhatsApp → {to_mobile}")
        print(message)
        print("="*60 + "\n")
        return {"sms": False, "whatsapp": False}

    result = {"sms": False, "whatsapp": False}

    try:
        from twilio.rest import Client  # type: ignore
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        # 1. Send plain SMS
        try:
            sms = client.messages.create(
                body=message,
                from_=settings.TWILIO_FROM_NUMBER,
                to=to_mobile,
            )
            logger.info(f"[SMS] Sent to {to_mobile}: SID={sms.sid}")
            result["sms"] = True
        except Exception as sms_err:
            logger.warning(f"[SMS] Failed to send SMS to {to_mobile}: {sms_err}")

        # 2. Send WhatsApp if WhatsApp sender is configured
        if settings.TWILIO_WHATSAPP_FROM:
            try:
                wa_from = _normalise_whatsapp_from(settings.TWILIO_WHATSAPP_FROM)
                wa_to = f"whatsapp:{to_mobile}"
                wa = client.messages.create(
                    body=message,
                    from_=wa_from,
                    to=wa_to,
                )
                logger.info(f"[WhatsApp] Sent to {wa_to} from {wa_from}: SID={wa.sid}")
                result["whatsapp"] = True
            except Exception as wa_err:
                logger.warning(f"[WhatsApp] Failed to send WhatsApp to {to_mobile}: {wa_err}")

    except ImportError:
        logger.warning(
            "[SMS] Twilio package not installed. "
            "Run: pip install twilio  — or add it to requirements.txt"
        )

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
    Send an automated SMS/WhatsApp acknowledgment to the customer when their service ticket is generated.
    """
    settings = get_settings()

    if not to_number:
        return {"sms": False, "whatsapp": False}

    to_mobile = _normalise_mobile(to_number)
    ticket_ref = f"SW-{str(ticket_id).zfill(4)}"

    message = (
        f"[Vodacom Technologies]\n"
        f"Dear {customer_name},\n"
        f"Your service ticket {ticket_ref} for \"{title}\" has been successfully logged.\n"
        f"Assigned Engineer: {person_on_duty or 'Vodacom Support Team'}\n"
        f"Priority: {priority.upper()}\n"
        f"Our team will work on resolving your query promptly."
    )

    if not _is_twilio_configured(settings):
        logger.info(
            f"[CUSTOMER SMS SIMULATED] To: {to_mobile}\n"
            f"Message:\n{message}\n"
        )
        print(f"\n{'='*60}")
        print(f"SIMULATED CUSTOMER ACK SMS/WhatsApp → {to_mobile}")
        print(message)
        print("="*60 + "\n")
        return {"sms": False, "whatsapp": False}

    result = {"sms": False, "whatsapp": False}

    try:
        from twilio.rest import Client  # type: ignore
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        # 1. Plain SMS
        try:
            sms = client.messages.create(
                body=message,
                from_=settings.TWILIO_FROM_NUMBER,
                to=to_mobile,
            )
            logger.info(f"[Customer SMS] Sent to {to_mobile}: SID={sms.sid}")
            result["sms"] = True
        except Exception as sms_err:
            logger.warning(f"[Customer SMS] Failed to send SMS to {to_mobile}: {sms_err}")

        # 2. WhatsApp
        if settings.TWILIO_WHATSAPP_FROM:
            try:
                wa_to = f"whatsapp:{to_mobile}"
                wa = client.messages.create(
                    body=message,
                    from_=settings.TWILIO_WHATSAPP_FROM,
                    to=wa_to,
                )
                logger.info(f"[Customer WhatsApp] Sent to {wa_to}: SID={wa.sid}")
                result["whatsapp"] = True
            except Exception as wa_err:
                logger.warning(f"[Customer WhatsApp] Failed to send WhatsApp to {to_mobile}: {wa_err}")

    except ImportError:
        logger.warning("[Customer SMS] Twilio package not installed.")

    return result

