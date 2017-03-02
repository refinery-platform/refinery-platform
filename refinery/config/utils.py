from rest_framework.routers import DefaultRouter


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
