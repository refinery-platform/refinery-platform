# Django settings specialised for the AWS environment.
#
# See https://github.com/parklab/refinery-platform/wiki/AWS for
# more details.

# Like dev, but overriding some things.
from .dev import *  # NOQA

EMAIL_BACKEND = 'django_smtp_ssl.SSLEmailBackend'
EMAIL_HOST_USER = get_setting('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = get_setting('EMAIL_HOST_PASSWORD')
EMAIL_USE_TLS = True
EMAIL_PORT = 465
