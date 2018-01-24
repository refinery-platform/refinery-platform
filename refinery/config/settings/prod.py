# custom settings for production environment

from .base import *  # NOQA

DEBUG = False
TEMPLATE_DEBUG = DEBUG

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
