# custom settings for development environment (e.g., Vagrant VM)

from .base import *

DEBUG = True
TEMPLATE_DEBUG = DEBUG

STATICFILES_DIRS = (
    os.path.join(BASE_DIR, "static/development"),
    os.path.join(BASE_DIR, "ui/development")
)

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Disable migrations when running unittests and use syncdb instead
SOUTH_TESTS_MIGRATE = False

INSTALLED_APPS += ('django_extensions',)
