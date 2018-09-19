# custom settings for development environment (e.g., Vagrant VM)

from .base import *  # NOQA

DEBUG = True

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

INSTALLED_APPS += (  # NOQA: F405
    'django_extensions',
)

# The GOOGLE_RECAPTCHA values below are only valid for testing/dev
# environments (They don't actually validate registering users)
# See: https://developers.google.com/recaptcha/docs/faq
GOOGLE_RECAPTCHA_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
GOOGLE_RECAPTCHA_SECRET_KEY = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"
