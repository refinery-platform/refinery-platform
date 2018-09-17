import os

from django.conf import settings
from django.core.wsgi import get_wsgi_application

# Set env vars to be made available to the wsgi application here
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.aws'
os.environ['DOCKER_HOST'] = settings.REFINERY_DOCKER_HOST
application = get_wsgi_application()
