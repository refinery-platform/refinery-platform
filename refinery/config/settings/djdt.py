from .dev import *  # NOQA

# required for Django Debug Toolbar
# https://github.com/django-debug-toolbar/django-debug-toolbar/issues/529
DEBUG_TOOLBAR_PATCH_SETTINGS = False

INSTALLED_APPS += (
    'debug_toolbar',
)

MIDDLEWARE_CLASSES += (
    'debug_toolbar.middleware.DebugToolbarMiddleware',
    'middleware.JsonAsHTML',
)

INTERNAL_IPS = ('192.168.50.1')
