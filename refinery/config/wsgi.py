import os
import django
from django.core.handlers.wsgi import WSGIHandler


# See http://stackoverflow.com/a/21124143/6031066

class WSGIEnvironment(WSGIHandler):
    """
    Class to override WSGIHANDLER.__call__ so that
    environment variables set by Apache are available to our python environment
    """

    def __call__(self, environ, start_response):
        # Add env vars to be passed from Apache here
        # Ex: os.environ[<env_var>] = environ[<env_var>]
        os.environ['DJANGO_SETTINGS_MODULE'] = environ[
            'DJANGO_SETTINGS_MODULE']

        django.setup()
        return super(WSGIEnvironment, self).__call__(environ, start_response)

application = WSGIEnvironment()
