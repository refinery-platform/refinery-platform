# custom settings for Vagrant VM

from .base import *

DEBUG = False
TEMPLATE_DEBUG = DEBUG

# Required when DEBUG = False
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '192.168.50.50']
