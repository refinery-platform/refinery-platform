import os

# This application object is used by the development server as well as any WSGI
# server configured to use this file.
from django.core.wsgi import get_wsgi_application

os.environ["DJANGO_SETTINGS_MODULE"] = 'config.settings.prod'
_application = get_wsgi_application()


def application(environ, start_response):
    # pass the WSGI environment variable on through to os.environ
    return _application(environ, start_response)
