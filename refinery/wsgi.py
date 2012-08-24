import os
import sys

# path is the parent directory of this script ('/var/www' in this case)
path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# we check for path because we're told to at the tail end of
# http://code.google.com/p/modwsgi/wiki/ConfigurationDirectives#WSGIReloadMechanism 
if path not in sys.path:
    sys.path.append(path)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "refinery.settings")

# This application object is used by the development server
# as well as any WSGI server configured to use this file.
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()

