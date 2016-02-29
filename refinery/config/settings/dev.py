# custom settings for development environment (e.g., Vagrant VM)

from .base import *  # NOQA

DEBUG = True
TEMPLATE_DEBUG = DEBUG

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Disable migrations when running unittests and use syncdb instead
SOUTH_TESTS_MIGRATE = False

INSTALLED_APPS += (
    'django_extensions',
    'django_nose',
)

TEST_RUNNER = 'django_nose.NoseTestSuiteRunner'
