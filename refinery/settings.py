# Django settings for refinery project.
# requires settings_local.py with machine specific information
# splitting ideas taken from https://code.djangoproject.com/wiki/SplitSettings (solution by Steven Armstrong)

import djcelery
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

djcelery.setup_loader()

DEBUG = False
TEMPLATE_DEBUG = DEBUG

# A tuple that lists people who get code error notifications.
ADMINS = (
    ('Refinery Admin', 'admin@example.org'),
)

# A tuple in the same format as ADMINS that specifies who should get broken link
# notifications when BrokenLinkEmailsMiddleware is enabled.
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

# transport://userid:password@hostname:port/virtual_host
#BROKER_URL = "amqp://guest:guest@localhost:5672//"
BROKER_HOST = "localhost"
BROKER_PORT = 5672
BROKER_USER = "guest"
BROKER_PASSWORD = "guest"
BROKER_VHOST = "/"

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# On Unix systems, a value of None will cause Django to use the same
# timezone as the operating system.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'America/New_York'

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
MEDIA_URL = '/media/'

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
    #'django.contrib.staticfiles.finders.DefaultStorageFinder',
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
    "core.context_processors.extra_context",
    "django.core.context_processors.request",    
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
    'django.contrib.markup',
    # NG: added for search and faceting (Solr support)
    'haystack', 
    # NG: added for celery (task queue)
    'djcelery', #django-celery
    # NG: added for API
    "tastypie",
    'guardian',
    'raven.contrib.django',
    'galaxy_connector',
    'core',
    'analysis_manager',
    'workflow_manager',
    'file_store',
    'file_server',   
    'visualization_manager',
    'data_set_manager', 
    'annotation_server',
    'registration',
    # RP: added for database migration between builds 
    'south', 
)

# IS: added for django-auth-ldap
# Baseline configuration
AUTH_LDAP_SERVER_URI = "ldap://ldap.example.com"
AUTH_LDAP_BIND_DN = ""
AUTH_LDAP_BIND_PASSWORD = ""

# Populate the Django user from the LDAP directory.
AUTH_LDAP_USER_ATTR_MAP = {
    "first_name": "givenName",
    "last_name": "sn",
    "email": "mail"
}

# NG: added for django-guardian
AUTHENTICATION_BACKENDS = (
    'refinery.core.models.RefineryLDAPBackend',
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
    'disable_existing_loggers': True,
    'root': {
        'level': 'DEBUG',
        'handlers': ['file'],
    },
    'formatters': {
        'verbose': {
            'format': '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s'
        },
        'default': {
            'format': '%(asctime)s %(levelname)-8s %(name)s %(funcName)s: %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S'
        },

    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler'
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose'
        },
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': os.path.join( BASE_DIR, "refinery.log" ),
            'formatter': 'verbose'
        }
                 
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
        'django.db.backends': {
            'level': 'ERROR',
            'handlers': ['console'],
            'propagate': False,
        },
        'raven': {
            'level': 'DEBUG',
            'handlers': ['console'],
            'propagate': False,
        },
        'data_set_manager': {
            'level': 'DEBUG',
            'handlers': ['console'],
            'propagate': False,
        },
        'isa_tab_parser': {
            'level': 'DEBUG',
            'handlers': ['console'],
            'propagate': False,
        },
        'file_store': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'file_server': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'analysis_manager': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'galaxy_connector': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# send email via SMTP, can be replaced with "django.core.mail.backends.console.EmailBackend" to send emails to the console
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
# Default email address to use for various automated correspondence from the site manager(s).
DEFAULT_FROM_EMAIL = 'webmaster@localhost'
EMAIL_HOST = 'localhost'
EMAIL_PORT = 25
# The email address that error messages come from, such as those sent to ADMINS and MANAGERS.
SERVER_EMAIL = 'root@localhost'

# Disable migrations when running unittests and use syncdb instead
SOUTH_TESTS_MIGRATE = False

# === Refinery Settings ===

# for registration module
ACCOUNT_ACTIVATION_DAYS = 7
REGISTRATION_OPEN = True

# set the name of the group that is used to share data with all users (= "the public")
REFINERY_PUBLIC_GROUP_NAME = "Public" 
REFINERY_PUBLIC_GROUP_ID = 100  # DO NOT CHANGE THIS after initialization of your Refinery instance

AE_BASE_QUERY = 'http://www.ebi.ac.uk/arrayexpress/xml/v2/experiments?'
AE_BASE_URL = "http://www.ebi.ac.uk/arrayexpress/experiments"

ISA_TAB_DIR = ''

# relative to MEDIA_ROOT, must exist along with 'temp' subdirectory
FILE_STORE_DIR = 'file_store'

# optional dictionary for translating file URLs into file system paths (and vice versa)
# format: {'pattern': 'replacement'} - may contain more than one key-value pair
REFINERY_FILE_SOURCE_MAP = {}

# location of the Solr server (must be accessible from the web browser)
REFINERY_SOLR_BASE_URL = "http://localhost:8983/solr/"

# used to replaces spaces in the names of dynamic fields in Solr indexing
REFINERY_SOLR_SPACE_DYNAMIC_FIELDS = "_"

HAYSTACK_CONNECTIONS = {
    'default': {
        'ENGINE': 'haystack.backends.solr_backend.SolrEngine',
        'URL': REFINERY_SOLR_BASE_URL + 'default',
        'EXCLUDED_INDEXES': ['data_set_manager.search_indexes.NodeIndex',
                             'core.search_indexes.DataSetIndex',
                             'core.search_indexes.ProjectIndex'],
    },
    'core': {
        'ENGINE': 'haystack.backends.solr_backend.SolrEngine',
        'URL': REFINERY_SOLR_BASE_URL + 'core',
        'EXCLUDED_INDEXES': ['data_set_manager.search_indexes.NodeIndex'],
    },
    'data_set_manager': {
        'ENGINE': 'haystack.backends.solr_backend.SolrEngine',
        'URL': REFINERY_SOLR_BASE_URL + 'data_set_manager',
        'EXCLUDED_INDEXES': ['core.search_indexes.DataSetIndex',
                             'core.search_indexes.ProjectIndex'],
    },
}

# list of paths to CSS files used to style Refinery pages (relative to STATIC_URL)
REFINERY_CSS = ["styles/css/refinery-style-bootstrap.css",
                "styles/css/refinery-style-bootstrap-responsive.css",
                "styles/css/refinery-style.css" ]

# set height of navigation bar (e.g. to fit a logo)
REFINERY_INNER_NAVBAR_HEIGHT = 20

# supply a path to a logo that will become part of the branding (see navbar height correctly!)
REFINERY_MAIN_LOGO = ""

# supply a Google analytics id "UA-..." (if set to "" tracking will be deactivated)
REFINERY_GOOGLE_ANALYTICS_ID = ""

# so managers and admins know Refinery is emailing them
EMAIL_SUBJECT_PREFIX = '[Refinery] '

TAXONOMY_URL = "ftp://ftp.ncbi.nih.gov/pub/taxonomy/taxdump.tar.gz"
UCSC_URL = "hgdownload.cse.ucsc.edu/admin/hgcentral.sql"

# Tag for repository mode
REFINERY_REPOSITORY_MODE = False

# Message to display on registration page when REGISTRATION_OPEN is set to False
REFINERY_REGISTRATION_CLOSED_MESSAGE = ''

#Tag for number of days user has to activate their account before it expires
ACCOUNT_ACTIVATION_DAYS = 7

# Message to be displayed near the top of every page (HTML allowed)
REFINERY_BANNER = ''

# Display REFINERY_BANNER to anonymous users only
REFINERY_BANNER_ANONYMOUS_ONLY = False

# Subject and message body of the welcome email sent to new users
REFINERY_WELCOME_EMAIL_SUBJECT = 'Welcome to Refinery'
REFINERY_WELCOME_EMAIL_MESSAGE = 'Please fill out your user profile'

# import local settings
try:
    from settings_local import *
except ImportError, exp:
    pass