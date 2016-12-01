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

        # Regarding the SO post from above and the caveat of losing the
        # "future-proofness" of Django's get_wsgi_application() it is good
        # to note that method does not change until Django 1.10, and said
        # change is very minor
        # See: http://bit.ly/2fQmPSw for the change
        django.setup()
        return super(WSGIEnvironment, self).__call__(environ, start_response)

application = WSGIEnvironment()
