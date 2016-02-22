# custom settings for development the UI using `grunt watch` which relies on
# `grunt build`.

from .dev import *  # NOQA

STATICFILES_DIRS = (
    os.path.join(BASE_DIR, "refinery/static/development"),
    os.path.join(BASE_DIR, "refinery/ui/development")
)
