# custom settings for production environment

from .base import *  # NOQA

DEBUG = False

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
