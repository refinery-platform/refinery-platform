# custom settings for production environment
import sys

from .base import *  # NOQA

DEBUG = False
TEMPLATE_DEBUG = DEBUG

# Required when DEBUG = False
ALLOWED_HOSTS = get_setting("ALLOWED_HOSTS")

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

# Only log WARNING or greater for tests w/ prod settings
if "test" in sys.argv:
    logging.disable(logging.WARNING)
