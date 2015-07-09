# custom settings for development the UI using `grunt watch` which relies on
# `grunt build`.

from .dev import *

STATICFILES_DIRS = (
    os.path.join(BASE_DIR, "static/development"),
    os.path.join(BASE_DIR, "ui/development")
)
