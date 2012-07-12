# Django settings for refinery project.
# requires settings_local.py with machine specific information
# splitting ideas taken from https://code.djangoproject.com/wiki/SplitSettings (solution by Steven Armstrong)

import os
import djcelery
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

djcelery.setup_loader()

DEBUG = False
TEMPLATE_DEBUG = DEBUG

ADMINS = (
    ('Refinery Admin', 'refinery@hms.harvard.edu'),
)

MANAGERS = ADMINS

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3', # Add 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': '',                      # Or path to database file if using sqlite3.
        'USER': '',                      # Not used with sqlite3.
        'PASSWORD': '',                  # Not used with sqlite3.
        'HOST': '',                      # Set to empty string for localhost. Not used with sqlite3.
        'PORT': '',                      # Set to empty string for default. Not used with sqlite3.
    }
}

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# On Unix systems, a value of None will cause Django to use the same
# timezone as the operating system.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'America/Chicago'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale
USE_L10N = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/home/media/media.lawrence.com/media/"
MEDIA_ROOT = ''

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://media.lawrence.com/media/", "http://example.com/media/"
MEDIA_URL = ''

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_ROOT = ''

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = '/static/'

# URL prefix for admin static files -- CSS, JavaScript and images.
# Make sure to use a trailing slash.
# Examples: "http://foo.com/static/admin/", "/static/admin/".
ADMIN_MEDIA_PREFIX = '/static/admin/'

# Additional locations of static files
STATICFILES_DIRS = (
    os.path.join( BASE_DIR, "static" ),
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# Overwritten in settings_local.py
SECRET_KEY = 'SECRET'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
#     'django.template.loaders.eggs.Loader',
)


TEMPLATE_CONTEXT_PROCESSORS = (
    'django.core.context_processors.debug',
    'django.core.context_processors.i18n',
    'django.core.context_processors.media',
    'django.core.context_processors.static',
    'django.contrib.auth.context_processors.auth',
    'django.contrib.messages.context_processors.messages',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
)

ROOT_URLCONF = 'refinery.urls'

TEMPLATE_DIRS = (
    os.path.join( BASE_DIR, "templates" ),

    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
)

# NG: added to provide fixtures for non-Refinery models
FIXTURE_DIRS = (
    os.path.join( BASE_DIR, "fixtures/auth" ),    
    os.path.join( BASE_DIR, "fixtures/guardian" ),    
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Uncomment the next line to enable the admin:
    'django.contrib.admin',
    # Uncomment the next line to enable admin documentation:
    'django.contrib.admindocs',
    # NG: added for that human touch ...
    'django.contrib.humanize',
    # NG: added for search and faceting (Solr support)
    'haystack', 
    # NG: added for celery (task queue)
    'djcelery', #django-celery
    # NG: added for API
    "tastypie",
    'guardian',
    'galaxy_connector',
    'refinery_repository',
    'core',
    'analysis_manager',
    'workflow_manager',
    'file_store',
    'file_server',   
    'data_set_manager', 
)

# NG: added for django-guardian
AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend', # default
    'guardian.backends.ObjectPermissionBackend',
)


# NG: added to support sessions
SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"

# NG: added to support anonymous users through django-guardian (id can be set to any value apparently)
ANONYMOUS_USER_ID = -1

# NG: added to enable user profiles (recommended way to extend Django user model)
AUTH_PROFILE_MODULE = 'core.UserProfile'

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler'
        },
        'console': {
            'class': 'logging.StreamHandler'
        }
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
        'file_store': {
            'handlers': ['console'],
            'level': 'DEBUG'
        }
    }
}

# NG: added for search and faceting
HAYSTACK_CONNECTIONS = {
    'default': {
        'ENGINE': 'haystack.backends.solr_backend.SolrEngine',
        'URL': 'http://127.0.0.1:8983/solr'
        # ...or for multicore...
        # 'URL': 'http://127.0.0.1:8983/solr/mysite',
    },
}


# === Refinery Settings ===

# set the name of the group that is used to share data with all users (= "the public")
REFINERY_PUBLIC_GROUP_NAME = "Public" 
REFINERY_PUBLIC_GROUP_ID = 1  # DO NOT CHANGE THIS after initialization of your Refinery instance

AE_BASE_QUERY = 'http://www.ebi.ac.uk/arrayexpress/xml/v2/experiments?'
AE_BASE_URL = "http://www.ebi.ac.uk/arrayexpress/experiments"

# relative to MEDIA_ROOT, must exist along with 'temp' subdirectory
FILE_STORE_DIR = 'files'

# import local settings
from settings_local import *
