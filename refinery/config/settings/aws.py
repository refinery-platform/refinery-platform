# Django settings specialised for the AWS environment
#
# See https://github.com/refinery-platform/refinery-platform/wiki/AWS for
# more details

# Like prod, but overriding some things.
from .prod import *  # NOQA


# email
EMAIL_BACKEND = 'django_smtp_ssl.SSLEmailBackend'
EMAIL_HOST_USER = get_setting('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = get_setting('EMAIL_HOST_PASSWORD')
EMAIL_USE_TLS = True
EMAIL_PORT = 465


# storage
INSTALLED_APPS += (
    'storages',
)
STATIC_BUCKET = get_setting('S3_BUCKET_NAME_BASE') + '-static'
STATIC_URL = 'https://{}.s3.amazonaws.com/'.format(STATIC_BUCKET)
STATICFILES_STORAGE = 'config.utils_aws.S3StaticStorage'
DEPLOYMENT_PLATFORM = 'aws'
