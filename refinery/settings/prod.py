# custom settings for production environment

from .base import *

DEBUG = False
TEMPLATE_DEBUG = DEBUG

# Required when DEBUG = False
ALLOWED_HOSTS = get_setting("ALLOWED_HOSTS")

STATICFILES_DIRS = (
    "/vagrant/refinery/static/production",
    "/vagrant/refinery/ui/production"
)

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
