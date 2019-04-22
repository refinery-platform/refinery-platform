from .dev import *  # NOQA

INSTALLED_APPS += (
    'debug_toolbar',
)

MIDDLEWARE_CLASSES += (
    'debug_toolbar.middleware.DebugToolbarMiddleware',
    'middleware.JsonAsHTML',
)

INTERNAL_IPS = ('192.168.50.1')
