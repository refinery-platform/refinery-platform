from django.conf import settings

from storages.backends.s3boto3 import S3Boto3Storage


class S3StaticStorage(S3Boto3Storage):
    def __init__(self):
        super(S3StaticStorage, self).__init__(bucket=settings.STATIC_BUCKET)
