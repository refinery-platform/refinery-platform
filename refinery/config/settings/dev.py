# custom settings for development environment (e.g., Vagrant VM)

from .base import *  # NOQA

DEBUG = True
TEMPLATE_DEBUG = DEBUG

# In older versions, ALLOWED_HOSTS wasn’t checked if DEBUG=True.
# This was also changed 1.8.16 to prevent a DNS rebinding attack.
ALLOWED_HOSTS = get_setting("ALLOWED_HOSTS")  # NOQA: F405

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

INSTALLED_APPS += ('django_extensions')  # NOQA: F405
