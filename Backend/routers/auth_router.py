from fastapi import APIRouter, Depends, HTTPException, status, Response, BackgroundTasks, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from db.database import get_db
from models.user import User, PatientProfile, DoctorProfile, UserRole
from schemas.user_schema import UserCreate, UserResponse, Token
from core.security import get_password_hash, verify_password, create_access_token, create_reset_password_token, verify_reset_password_token, get_current_user
from core.messages import ErrorMessages, SuccessMessages
import os
import secrets
from pydantic import BaseModel, EmailStr
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi_sso.sso.google import GoogleSSO

router = APIRouter(prefix="/auth", tags=["Authentication"])

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "YOUR_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "YOUR_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

google_sso = GoogleSSO(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    allow_insecure_http=True
)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail=ErrorMessages.EMAIL_ALREADY_EXISTS)
    
    if user.role in [UserRole.ADMIN, UserRole.DOCTOR]:
        expected_code = os.environ.get("ADMIN_SECRET_CODE", "12345")
        if user.admin_code != expected_code:
            raise HTTPException(status_code=403, detail=ErrorMessages.INVALID_ADMIN_CODE)

    hashed_pwd = get_password_hash(user.password)
    new_user = User(email=user.email, password_hash=hashed_pwd, role=user.role)

    db.add(new_user)
    db.flush()

    if user.role == UserRole.PATIENT:
        new_profile = PatientProfile(user_id=new_user.id, cnp=f"TEMP_{new_user.id}")
        db.add(new_profile)
    elif user.role == UserRole.DOCTOR:
        new_profile = DoctorProfile(user_id=new_user.id, specialization="N/A", license_number=f"TEMP_{new_user.id}")
        db.add(new_profile)
    
    db.commit()
    db.refresh(new_user)

    return new_user

@router.post("/login", response_model=Token)
def login_user(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ErrorMessages.INVALID_CREDENTIALS,
            headers={"WWW-Authenticate":"Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub":user.email, "role":user.role}
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=60 * 24 * 60,
        samesite="lax",
        secure=FRONTEND_URL.startswith("https")
    )

    return {"access_token": access_token, "token_type": "bearer"}

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    language: str = "en"

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

def send_reset_email(email_to: str, reset_link: str, language: str = "en"):
    smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USERNAME")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_password:
        return

    # Fallback to English if language is not supported
    lang_code = language if language in ["en", "ro"] else "en"
    
    # Check if we get short lang code like en-US
    if "-" in lang_code:
        lang_code = lang_code.split("-")[0]
        if lang_code not in ["en", "ro"]:
            lang_code = "en"
            
    from core.messages import EMAIL_TEMPLATES
    t = EMAIL_TEMPLATES[lang_code]

    msg = MIMEMultipart("alternative")
    msg["Subject"] = t["subject"]
    msg["From"] = f"E-Health AI <{smtp_user}>"
    msg["To"] = email_to

    text = f"{t['body']}: {reset_link}"
    html = f"""\
    <html>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; padding: 40px; margin: 0; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e4e4e7;">
            <div style="background-color: #fee2e2; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px auto; text-align: center; line-height: 60px;">
                <span style="font-size: 30px; vertical-align: middle; margin: 0; display: inline-block; line-height: normal;">🏥</span>
            </div>
            <h2 style="color: #09090b; margin-bottom: 10px; font-size: 24px;">{t['title']}</h2>
            <p style="font-size: 16px; color: #71717a; margin-bottom: 30px; line-height: 1.5;">
                {t['body']}
            </p>
            <a href="{reset_link}" style="background-color: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                {t['button']}
            </a>
            <p style="font-size: 14px; color: #a1a1aa; margin-top: 35px; border-top: 1px solid #f4f4f5; padding-top: 20px;">
                {t['footer']}
            </p>
        </div>
      </body>
    </html>
    """

    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")
    msg.attach(part1)
    msg.attach(part2)

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, email_to, msg.as_string())
        server.quit()
    except Exception as e:
        print(f"Failed to send email: {e}")

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        return {"message": SuccessMessages.PASSWORD_RESET_SENT}
    
    token = create_reset_password_token(user.email)
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    
    background_tasks.add_task(send_reset_email, user.email, reset_link, req.language)
    return {"message": SuccessMessages.PASSWORD_RESET_SENT}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = verify_reset_password_token(req.token)
    if not email:
        raise HTTPException(status_code=400, detail=ErrorMessages.INVALID_TOKEN)
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail=ErrorMessages.USER_NOT_FOUND)
        
    user.password_hash = get_password_hash(req.new_password)
    db.commit()
    
    return {"message": SuccessMessages.PASSWORD_UPDATED}

@router.post("/logout")
def logout_user(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": SuccessMessages.LOGOUT_SUCCESS}

@router.get("/google/login")
async def google_login():
    with google_sso:
        return await google_sso.get_login_redirect()

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    with google_sso:
        user_info = await google_sso.verify_and_process(request)
        
    user = db.query(User).filter(User.email == user_info.email).first()
    
    if not user:
        # Create a new patient by default
        random_password = secrets.token_urlsafe(16)
        hashed_pwd = get_password_hash(random_password)
        
        user = User(email=user_info.email, password_hash=hashed_pwd, role=UserRole.PATIENT)
        db.add(user)
        db.flush()
        
        new_profile = PatientProfile(user_id=user.id, cnp=f"TEMP_{user.id}")
        db.add(new_profile)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}
    )

    # Redirect to the frontend dashboard and set the cookie
    redirect_url = f"{FRONTEND_URL}/dashboard"
    redirect_response = RedirectResponse(url=redirect_url)
    redirect_response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=60 * 24 * 60,
        samesite="lax",
        secure=FRONTEND_URL.startswith("https")
    )
    
    return redirect_response

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
