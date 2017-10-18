# custom settings for production environment

from .base import *  # NOQA

DEBUG = False
TEMPLATE_DEBUG = DEBUG

# Required when DEBUG = False
ALLOWED_HOSTS = get_setting("ALLOWED_HOSTS")  # NOQA: F405
