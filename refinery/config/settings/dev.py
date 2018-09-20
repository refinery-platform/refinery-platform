# custom settings for development environment (e.g., Vagrant VM)

from .base import *  # NOQA

DEBUG = True

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

INSTALLED_APPS += (  # NOQA: F405
    'django_extensions',
)
