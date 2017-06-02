import os

from django.core.wsgi import get_wsgi_application

# Set env vars to be made available to the wsgi application here
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.djdt'

application = get_wsgi_application()
