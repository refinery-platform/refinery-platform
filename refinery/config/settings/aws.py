# Django settings specialised for the AWS environment.
#
# See https://github.com/refinery-platform/refinery-platform/wiki/AWS for
# more details.

# Like prod, but overriding some things.
from .prod import *  # NOQA


EMAIL_BACKEND = 'django_smtp_ssl.SSLEmailBackend'
EMAIL_HOST_USER = get_setting('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = get_setting('EMAIL_HOST_PASSWORD')
EMAIL_USE_TLS = True
EMAIL_PORT = 465

INSTALLED_APPS += (
    'storages',
)
AWS_STORAGE_BUCKET_NAME = get_setting('AWS_STORAGE_BUCKET_NAME')
AWS_S3_CUSTOM_DOMAIN = '{}.s3.amazonaws.com'.format(AWS_STORAGE_BUCKET_NAME)
STATIC_URL = 'https://{}/'.format(AWS_S3_CUSTOM_DOMAIN)
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
