from django.conf import settings

from storages.backends.s3boto3 import S3Boto3Storage


class S3StaticStorage(S3Boto3Storage):
    # Django static files storage
    bucket_name = settings.STATIC_BUCKET
    # remove query parameter authentication from generated URLs
    querystring_auth = False
    # custom_domain is used to avoid obtaining security tokens for each of
    # the static files (https://stackoverflow.com/a/28749849)
    custom_domain = settings.STATIC_BUCKET + '.s3.amazonaws.com'
