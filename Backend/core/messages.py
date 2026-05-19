class ErrorMessages:
    INVALID_CREDENTIALS = "Invalid email or password."
    EMAIL_ALREADY_EXISTS = "Email is already registered."
    USER_NOT_FOUND = "User not found."
    INVALID_TOKEN = "Invalid or expired token."
    NOT_AUTHENTICATED = "Not authenticated."
    NO_ADMIN_RIGHTS = "No admin rights."
    INVALID_ADMIN_CODE = "Invalid admin secret code."
    COULD_NOT_VALIDATE = "Couldn't validate the login."

class SuccessMessages:
    LOGOUT_SUCCESS = "Logged out successfully."
    PASSWORD_RESET_SENT = "If an account with that email exists, a reset link has been sent."
    PASSWORD_UPDATED = "Password updated successfully."

EMAIL_TEMPLATES = {
    "en": {
        "subject": "E-Health AI - Password Reset Request",
        "title": "Reset Your Password",
        "body": "We received a request to reset your password for your <b>E-Health AI</b> account. Click the button below to set up a new password.",
        "button": "Reset Password",
        "footer": "If you didn't request this email, there's nothing to worry about — you can safely ignore it."
    },
    "ro": {
        "subject": "E-Health AI - Cerere de resetare a parolei",
        "title": "Resetează Parola",
        "body": "Am primit o cerere pentru resetarea parolei contului tău <b>E-Health AI</b>. Dă click pe butonul de mai jos pentru a seta o nouă parolă.",
        "button": "Resetează Parola",
        "footer": "Dacă nu ai solicitat tu acest email, nu trebuie să îți faci griji — îl poți ignora."
    }
}
