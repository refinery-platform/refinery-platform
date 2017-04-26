from django.conf import settings

from rest_framework.routers import DefaultRouter
from storages.backends.s3boto3 import S3Boto3Storage


class RouterCombiner(DefaultRouter):
    """
    Extends `DefaultRouter` class to add a method for extending url routes
    from another router.

    Allows for app-specific url definitions to stay inside their own apps.
    """
    def extend(self, router):
        """
        Extend the routes with url routes of the passed in router.

        router: DRF Router instance containing route definitions.
        """
        self.urls.extend(router.urls)
        self.registry.extend(router.registry)


class S3StaticStorage(S3Boto3Storage):
    def __init__(self):
        super(S3StaticStorage, self).__init__(bucket=settings.STATIC_BUCKET)
