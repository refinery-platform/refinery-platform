# custom settings for production environment

from .base import *  # NOQA

DEBUG = False

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

GOOGLE_RECAPTCHA_SITE_KEY = get_setting("GOOGLE_RECAPTCHA_SITE_KEY")
GOOGLE_RECAPTCHA_SECRET_KEY = get_setting("GOOGLE_RECAPTCHA_SECRET_KEY")
