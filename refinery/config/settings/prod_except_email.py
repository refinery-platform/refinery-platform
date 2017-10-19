# custom settings for production environment

from .prod import *  # NOQA

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
