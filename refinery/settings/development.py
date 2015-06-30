# custom settings for Vagrant VM

from .base import *

DEBUG = True
TEMPLATE_DEBUG = DEBUG

# required for Django Debug Tool Bar
INSTALLED_APPS += (
    'debug_toolbar',
)
MIDDLEWARE_CLASSES += (
    'debug_toolbar.middleware.DebugToolbarMiddleware',
    'middleware.JsonAsHTML',
)
INTERNAL_IPS = ('192.168.50.1')
