def send_email(to_email: str, subject: str, body: str):
    """
    Mock email sender for notifications.
    In a production environment, you would integrate smtplib or a service like SendGrid here.
    """
    print("\n" + "="*50)
    print("MOCK EMAIL NOTIFICATION SENT")
    print(f"To:      {to_email}")
    print(f"Subject: {subject}")
    print("-" * 50)
    print(body)
    print("="*50 + "\n")
