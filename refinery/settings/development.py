# custom settings for development environment (e.g., Vagrant VM)

from .base import *

DEBUG = True
TEMPLATE_DEBUG = DEBUG

# required for Django Debug Toolbar
INSTALLED_APPS += (
    'debug_toolbar',
)
MIDDLEWARE_CLASSES += (
    'debug_toolbar.middleware.DebugToolbarMiddleware',
    'middleware.JsonAsHTML',
)
INTERNAL_IPS = ('192.168.50.1')

STATICFILES_DIRS = (
    "/vagrant/refinery/static/development",
    "/vagrant/refinery/ui/development"
)
