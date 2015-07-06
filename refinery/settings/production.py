# custom settings for production environment

from .base import *

DEBUG = False
TEMPLATE_DEBUG = DEBUG

# Required when DEBUG = False
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '192.168.50.50']

STATICFILES_DIRS = (
    "/vagrant/refinery/static/production",
    "/vagrant/refinery/ui/production"
)
