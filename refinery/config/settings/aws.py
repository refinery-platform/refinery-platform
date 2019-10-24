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

MEDIA_BUCKET = get_setting('REFINERY_S3_MEDIA_BUCKET_NAME')
STATIC_BUCKET = get_setting('REFINERY_S3_STATIC_BUCKET_NAME')
UPLOAD_BUCKET = get_setting('REFINERY_S3_UPLOAD_BUCKET_NAME')

STATICFILES_STORAGE = 'config.utils_aws.S3StaticStorage'
STATIC_URL = 'https://{}.s3.amazonaws.com/'.format(STATIC_BUCKET)

if REFINERY_S3_USER_DATA:
    DEFAULT_FILE_STORAGE = 'file_store.utils.S3MediaStorage'
    MEDIA_URL = 'https://{}.s3.amazonaws.com/'.format(MEDIA_BUCKET)
    LOCAL_TEMP_STORAGE = os.path.join(BASE_DIR, 'temp')

COGNITO_IDENTITY_POOL_ID = get_setting('COGNITO_IDENTITY_POOL_ID')

# Refinery
REFINERY_AWS_REGION = get_setting('REFINERY_AWS_REGION')
REFINERY_DEPLOYMENT_PLATFORM = 'aws'
REFINERY_DOCKER_HOST = get_setting("REFINERY_DOCKER_HOST")
