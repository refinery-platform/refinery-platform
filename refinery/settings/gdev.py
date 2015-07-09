# custom settings for development environment specific to Grunt

from .djdt import *

STATICFILES_DIRS = (
    os.path.join(BASE_DIR, "static/development"),
    os.path.join(BASE_DIR, "ui/development")
)
