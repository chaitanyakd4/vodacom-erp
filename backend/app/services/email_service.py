from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
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
    username = conf.MAIL_USERNAME
    return (
        username == "dummy@example.com" or
        username == "your_company_email@gmail.com" or
        "example" in username or
        conf.MAIL_PASSWORD == "dummy" or
        conf.MAIL_PASSWORD == "your_app_password"
    )

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
        logging.error(f"Failed to send email to {to_email}: {str(e)}")
        raise e


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
        logging.error(f"Failed to send password reset email to {to_email}: {str(e)}")
        raise e

