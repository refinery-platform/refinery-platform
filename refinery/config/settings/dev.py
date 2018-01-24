# custom settings for development environment (e.g., Vagrant VM)

from .base import *  # NOQA

DEBUG = True
TEMPLATE_DEBUG = DEBUG

# ALLOWED_HOSTS required in 1.8.16 to prevent a DNS rebinding attack.
ALLOWED_HOSTS = get_setting("ALLOWED_HOSTS")  # NOQA: F405

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

INSTALLED_APPS += (  # NOQA: F405
    'django_extensions',
)
