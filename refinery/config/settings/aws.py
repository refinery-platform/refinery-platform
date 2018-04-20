# Django settings specialised for the AWS environment
#
# See https://github.com/refinery-platform/refinery-platform/wiki/AWS for
# more details

from .prod import *  # NOQA 405

# Email
EMAIL_BACKEND = 'django_smtp_ssl.SSLEmailBackend'
EMAIL_HOST_USER = get_setting('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = get_setting('EMAIL_HOST_PASSWORD')
EMAIL_USE_TLS = True
EMAIL_PORT = 465

# Storage
INSTALLED_APPS += (
    'storages',
)

STATIC_BUCKET = get_setting('S3_BUCKET_NAME_BASE') + '-static'
MEDIA_BUCKET = get_setting('S3_BUCKET_NAME_BASE') + '-media'
UPLOAD_BUCKET = get_setting('S3_BUCKET_NAME_BASE') + '-upload'

STATIC_URL = 'https://{}.s3.amazonaws.com/'.format(STATIC_BUCKET)

STATICFILES_STORAGE = 'config.utils_aws.S3StaticStorage'
if REFINERY_S3_USER_DATA:
    DEFAULT_FILE_STORAGE = 'file_store.utils.S3MediaStorage'

COGNITO_IDENTITY_POOL_ID = get_setting('COGNITO_IDENTITY_POOL_ID')

# Refinery
REFINERY_DEPLOYMENT_PLATFORM = 'aws'
REFINERY_DOCKER_HOST = get_setting("REFINERY_DOCKER_HOST")
