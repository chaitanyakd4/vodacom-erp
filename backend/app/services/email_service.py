from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from typing import Optional, List, Tuple, Any
import logging
from app.core.config import get_settings

settings = get_settings()

conf = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USERNAME,
    MAIL_PASSWORD=settings.SMTP_PASSWORD.replace(" ", ""),  # Gmail App Passwords must have no spaces
    MAIL_FROM=settings.SMTP_FROM_EMAIL,
    MAIL_PORT=settings.SMTP_PORT,
    MAIL_SERVER=settings.SMTP_SERVER,
    MAIL_FROM_NAME=settings.SMTP_FROM_NAME,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

fm = FastMail(conf)

def is_dummy_smtp() -> bool:
    curr = get_settings()
    username = curr.SMTP_USERNAME or ""
    pwd = curr.SMTP_PASSWORD or ""
    return (
        username in ("dummy@example.com", "your_company_email@gmail.com", "") or
        "example" in username or
        pwd in ("dummy", "your_app_password", "")
    )

import smtplib
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio


def _clean_smtp_host_port(raw_host: str, raw_port: any):
    """Normalize and sanitize SMTP host and port, stripping protocol, trailing colons, quotes, and dots."""
    host = str(raw_host or "").strip().strip('"\'')
    port = 587
    if ":" in host:
        parts = host.split(":")
        host = parts[0].strip()
        try:
            port = int(parts[1].strip())
        except (ValueError, IndexError):
            port = 587
    elif raw_port:
        try:
            port = int(str(raw_port).strip().strip('"\''))
        except (ValueError, TypeError):
            port = 587

    host = host.lstrip("./ ")
    if not host:
        host = "smtpout.secureserver.net"
    return host, port


def _create_smtp_connection(host: str, port: int, timeout: int = 15):
    """Creates a robust, SSL/TLS-ready SMTP connection with proper server_hostname for SNI."""
    import ssl
    clean_host, clean_port = _clean_smtp_host_port(host, port)

    if clean_port == 465:
        ctx = ssl.create_default_context()
        server = smtplib.SMTP_SSL(clean_host, clean_port, timeout=timeout, context=ctx)
        server.ehlo(clean_host)
        return server
    else:
        server = smtplib.SMTP(clean_host, clean_port, timeout=timeout)
        server.ehlo(clean_host)
        if server.has_extn("starttls"):
            ctx = ssl.create_default_context()
            server.starttls(context=ctx)
            server.ehlo(clean_host)
        return server


def _get_ipv4_host(hostname: str) -> str:
    """Resolve hostname strictly to an IPv4 address to prevent [Errno 101] Network is unreachable on Cloud environments (Render/AWS)."""
    try:
        clean_host, _ = _clean_smtp_host_port(hostname, 587)
        infos = socket.getaddrinfo(clean_host, None, socket.AF_INET)
        if infos:
            ip = infos[0][4][0]
            logging.info(f"[DNS] Resolved {clean_host} to IPv4: {ip}")
            return ip
    except Exception as dns_err:
        logging.warning(f"[DNS] IPv4 resolution notice for {hostname}: {dns_err}")
    return hostname


def _send_via_smtplib(to_email: str, subject: str, html_content: str, attachments: Optional[list] = None) -> bool:
    """Fallback synchronous SMTP sender using Python standard library smtplib with attachment support."""
    try:
        from email.mime.base import MIMEBase
        from email import encoders

        curr = get_settings()
        server = _create_smtp_connection(curr.SMTP_SERVER, curr.SMTP_PORT, timeout=20)
        password = curr.SMTP_PASSWORD.replace(" ", "")
        server.login(curr.SMTP_USERNAME, password)

        from_name = (curr.SMTP_FROM_NAME or "Vodacom Technologies").strip('"\'')
        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{curr.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))


        if attachments:
            for item in attachments:
                if isinstance(item, (list, tuple)) and len(item) >= 2:
                    filename = item[0]
                    content = item[1]
                else:
                    continue
                if not filename or not content:
                    continue
                part = MIMEBase("application", "octet-stream")
                part.set_payload(content)
                encoders.encode_base64(part)
                part.add_header("Content-Disposition", "attachment", filename=filename)
                msg.attach(part)

        server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()
        logging.info(f"[SMTPLIB IPv4] Sent email to {to_email} with {len(attachments or [])} attachment(s)")
        return True
    except Exception as e:
        logging.error(f"[SMTPLIB_ERROR] Failed to send email to {to_email}: {e}")
        raise e



async def send_amc_reminder_email(to_email: str, customer_name: str, contract_number: str, expiry_date: str):
    """
    Sends an AMC expiry reminder email.
    """
    if is_dummy_smtp():
        # Simulating if not configured
        logging.info(f"SIMULATED EMAIL to {to_email}: AMC {contract_number} for {customer_name} expires on {expiry_date}")
        print(f"\n=======================================================")
        print(f"SIMULATED AMC EXPIRY EMAIL TO: {to_email}")
        print(f"Customer: {customer_name}")
        print(f"Contract: {contract_number}")
        print(f"Expiry Date: {expiry_date}")
        print(f"=======================================================\n")
        return True

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #1B3A8C;">Vodacom Technologies</h2>
        <p>Dear <strong>{customer_name}</strong>,</p>
        <p>This is a friendly reminder that your Annual Maintenance Contract (AMC) is approaching its expiry date.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #009933; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Contract Number:</strong> {contract_number}</p>
            <p style="margin: 5px 0;"><strong>Expiry Date:</strong> {expiry_date}</p>
        </div>
        <p>Please contact us at your earliest convenience to renew your contract and ensure uninterrupted service.</p>
        <br>
        <p>Best regards,<br><strong>Vodacom Technologies Support Team</strong></p>
    </div>
    """

    message = MessageSchema(
        subject=f"Action Required: AMC Renewal for {contract_number}",
        recipients=[to_email],
        body=html_content,
        subtype=MessageType.html
    )

    try:
        await fm.send_message(message)
        logging.info(f"Sent reminder email to {to_email} for AMC {contract_number}")
        return True
    except Exception as e:
        logging.warning(f"FastMail send failed ({e}), trying standard smtplib fallback...")
        try:
            return await asyncio.to_thread(_send_via_smtplib, to_email, f"Action Required: AMC Renewal for {contract_number}", html_content)
        except Exception as fallback_err:
            logging.error(f"Failed to send email to {to_email}: {fallback_err}")
            raise fallback_err


async def send_password_reset_email(to_email: str, reset_link: str):
    """
    Sends a password reset email.
    """
    if is_dummy_smtp():
        # Simulating if not configured
        logging.info(f"SIMULATED PASSWORD RESET EMAIL to {to_email}: Link is {reset_link}")
        print(f"\n=======================================================")
        print(f"PASSWORD RESET LINK FOR {to_email}:")
        print(reset_link)
        print(f"=======================================================\n")
        return True

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #1B3A8C;">Vodacom Technologies</h2>
        <p>Hello,</p>
        <p>We received a request to reset the password for your account.</p>
        <p>Please click the button below to reset your password. This link will expire in 15 minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #009933; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>If you did not request this, you can safely ignore this email.</p>
        <br>
        <p>Best regards,<br><strong>Vodacom Technologies Support Team</strong></p>
    </div>
    """

    message = MessageSchema(
        subject="Reset Password - Vodacom Technologies",
        recipients=[to_email],
        body=html_content,
        subtype=MessageType.html
    )

    try:
        await fm.send_message(message)
        logging.info(f"Sent password reset email to {to_email}")
        return True
    except Exception as e:
        logging.warning(f"FastMail send failed ({e}), trying standard smtplib fallback...")
        try:
            return await asyncio.to_thread(_send_via_smtplib, to_email, "Reset Password - Vodacom Technologies", html_content)
        except Exception as fallback_err:
            logging.error(f"Failed to send password reset email to {to_email}: {fallback_err}")
            raise fallback_err


async def send_custom_reminder_email(to_email: str, subject: str, body_text: str, attachments: Optional[list] = None):
    """
    Sends a custom client reminder email (AMC, Pending Invoice, Sales Enquiry, Service Work) with optional file attachments.
    """
    if is_dummy_smtp():
        att_str = f" with {len(attachments)} attachment(s): {', '.join([a[0] for a in attachments])}" if attachments else ""
        logging.info(f"SIMULATED CUSTOM REMINDER to {to_email}: {subject}{att_str}")
        print(f"\n=======================================================")
        print(f"SIMULATED REMINDER TO: {to_email}")
        print(f"Subject: {subject}")
        if attachments:
            print(f"Attachments: {', '.join([a[0] for a in attachments])}")
        print(f"Body:\n{body_text}")
        print(f"=======================================================\n")
        return True

    formatted_body = body_text.replace("\n", "<br>")
    attachments_box = ""
    if attachments:
        file_list_html = "".join([f"<li style='margin: 4px 0; font-family: monospace;'>📎 {a[0]}</li>" for a in attachments])
        attachments_box = f"""
        <div style="margin-top: 20px; padding: 12px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold; color: #1B3A8C;">Attached Document(s):</p>
            <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155;">
                {file_list_html}
            </ul>
        </div>
        """

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #1B3A8C; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="color: #1B3A8C; margin: 0; font-size: 22px;">Vodacom Technologies Pvt. Ltd.</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 12px;">Official Client Notification</p>
        </div>
        <div style="color: #334155; font-size: 14px; line-height: 1.6;">
            {formatted_body}
        </div>
        {attachments_box}
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0;">This is an automated notification from <strong>Vodacom Technologies ERP</strong>.</p>
            <p style="margin: 3px 0 0 0;">If you have any questions, please contact our support team.</p>
        </div>
    </div>
    """

    try:
        return await asyncio.to_thread(_send_via_smtplib, to_email, subject, html_content, attachments)
    except Exception as e:
        logging.error(f"Failed to send email to {to_email}: {e}")
        raise e




