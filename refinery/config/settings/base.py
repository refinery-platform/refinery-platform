import json
import logging
import os
import djcelery
import subprocess
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)

# get the absolute path of the top level project dir
BASE_DIR = os.path.normpath(os.path.join(os.path.abspath(__file__),
                                         "../../../.."))

local_settings_file_path = os.path.join(BASE_DIR,
                                        'refinery/config/config.json')

# load config.json
try:
    with open(local_settings_file_path, 'r') as f:
        local_settings = json.load(f)
except IOError as e:
    error_msg = "Could not open '{}': {}".format(local_settings_file_path, e)
    raise ImproperlyConfigured(error_msg)


def get_setting(name, settings=local_settings):
    """Get the local settings variable or return explicit exception"""
    try:
        return settings[name]
    except KeyError:
        raise ImproperlyConfigured("Missing setting '{0}'".format(name))


# TODO: remove after switching to the new Celery API
djcelery.setup_loader()

# a tuple that lists people who get code error notifications
# (convert JSON list of lists to tuple of tuples)
ADMINS = tuple(map(lambda x: tuple(x), get_setting("ADMINS")))

# A tuple in the same format as ADMINS that specifies who should get broken
# link notifications when BrokenLinkEmailsMiddleware is enabled
MANAGERS = ADMINS

DATABASES = get_setting("DATABASES")

# transport://userid:password@hostname:port/virtual_host
BROKER_URL = get_setting("BROKER_URL")

TIME_ZONE = get_setting("TIME_ZONE")

LANGUAGE_CODE = get_setting("LANGUAGE_CODE")

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = get_setting("USE_I18N")

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale
USE_L10N = get_setting("USE_L10N")

# stores date and time information in UTC in the database
USE_TZ = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/home/media/media.lawrence.com/media/"
MEDIA_ROOT = get_setting("MEDIA_ROOT")
if not os.path.isabs(MEDIA_ROOT):
    MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://media.lawrence.com/media/", "http://example.com/media/"
MEDIA_URL = get_setting("MEDIA_URL")

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_ROOT = get_setting("STATIC_ROOT")
if not os.path.isabs(STATIC_ROOT):
    STATIC_ROOT = os.path.join(BASE_DIR, "static")

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = get_setting("STATIC_URL")

STATICFILES_DIRS = (
    os.path.join(BASE_DIR, "refinery/static/production"),
    os.path.join(BASE_DIR, "refinery/ui/production")
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',  # for admin app
    'djangular.finders.NamespacedAngularAppDirectoriesFinder',
)

# Make sure to set this to a random string in production
SECRET_KEY = get_setting("SECRET_KEY")

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
    # 'django.template.loaders.eggs.Loader',
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
    'core.middleware.DatabaseFailureMiddleware',
)

ROOT_URLCONF = 'config.urls'

TEMPLATE_DIRS = (
    os.path.join(BASE_DIR, "refinery/templates"),
    # Put strings here, like "/home/html/django_templates" or
    # "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
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
    'django_markwhat',
    # NG: added for search and faceting (Solr support)
    'haystack',
    # NG: added for celery (task queue)
    'djcelery',  # django-celery
    # NG: added for API
    "tastypie",
    'guardian',
    'djangular',
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
    'flatblocks',
    # RP: added for database migration between builds
    'south',
    'chunked_upload',
    'rest_framework',
    'rest_framework_swagger',
)

# NG: added for django-guardian
AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',  # default
    'guardian.backends.ObjectPermissionBackend',
)

# NG: added to support sessions
SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"

# NG: added to support anonymous users through django-guardian
# (id can be set to any value apparently)
ANONYMOUS_USER_ID = -1

# NG: added to enable user profiles
# (recommended way to extend Django user model)
AUTH_PROFILE_MODULE = 'core.UserProfile'

LOGGING = {
    'version': 1,
    'disable_existing_loggers': True,
    'root': {
        'level': 'DEBUG',
        'handlers': ['console'],
    },
    'formatters': {
        'default': {
            'format': '%(asctime)s %(levelname)-8s %(name)s:%(lineno)s '
                      '%(funcName)s() - %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S'
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        }
    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        },
        'console': {
            'level': get_setting("LOG_LEVEL"),
            'class': 'logging.StreamHandler',
            'formatter': 'default'
        },
    },
    'loggers': {
        'django.request': {
            'handlers': ['console', 'mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
        'django.db.backends': {
            'level': 'ERROR',
            'handlers': ['console'],
            'propagate': False,
        },
        'analysis_manager': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'annotation_server': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'core': {
            'level': 'DEBUG',
            'handlers': ['console'],
            'propagate': False,
        },
        'data_set_manager': {
            'level': 'DEBUG',
            'handlers': ['console'],
            'propagate': False,
        },
        'file_server': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'file_store': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'galaxy_connector': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'isa_tab_parser': {
            'level': 'DEBUG',
            'handlers': ['console'],
            'propagate': False,
        },
        'visualization_manager': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'workflow_manager': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Expiration time of a token API that was originally designed to handle group
# invitations using uuid-based tokens.
TOKEN_DURATION = get_setting("TOKEN_DURATION")

# Default email address to use for various automated correspondence from the
# site manager(s).
DEFAULT_FROM_EMAIL = get_setting("DEFAULT_FROM_EMAIL")
EMAIL_HOST = get_setting("EMAIL_HOST")
EMAIL_PORT = get_setting("EMAIL_PORT")
# The email address that error messages come from, such as those sent to ADMINS
# and MANAGERS.
SERVER_EMAIL = get_setting("SERVER_EMAIL")
# so managers and admins know Refinery is emailing them
EMAIL_SUBJECT_PREFIX = get_setting("EMAIL_SUBJECT_PREFIX")

# for system stability
CELERYD_MAX_TASKS_PER_CHILD = get_setting("CELERYD_MAX_TASKS_PER_CHILD")
CELERY_ROUTES = {"file_store.tasks.import_file": {"queue": "file_import"}}

CHUNKED_UPLOAD_ABSTRACT_MODEL = False

SOUTH_MIGRATION_MODULES = {
    'djcelery': 'djcelery.south_migrations',
}

# === Refinery Settings ===

# for registration module
ACCOUNT_ACTIVATION_DAYS = get_setting("ACCOUNT_ACTIVATION_DAYS")
REGISTRATION_OPEN = get_setting("REGISTRATION_OPEN")
# message to display on registration page when REGISTRATION_OPEN is set to
# False
REFINERY_REGISTRATION_CLOSED_MESSAGE = get_setting(
    "REFINERY_REGISTRATION_CLOSED_MESSAGE")

# set the name of the group that is used to share data with all users
# (= "the public")
REFINERY_PUBLIC_GROUP_NAME = "Public"
# DO NOT CHANGE THIS after initialization of your Refinery instance
REFINERY_PUBLIC_GROUP_ID = 100

# Base query for what kind of ArrayExpress studies to pull in
# (e.g. only ChIP-Seq studies, or studies updated after a certain date)
AE_BASE_QUERY = 'http://www.ebi.ac.uk/arrayexpress/xml/v2/experiments?'

# prefix of the URL where all ArrayExpress studies' MAGE-TAB files can be
# accessed
AE_BASE_URL = "http://www.ebi.ac.uk/arrayexpress/experiments"

ISA_TAB_DIR = get_setting("ISA_TAB_DIR")

# relative to MEDIA_ROOT, must exist along with 'temp' subdirectory
FILE_STORE_DIR = 'file_store'

# optional dictionary for translating file URLs into locally accessible file
# system paths (and vice versa) by substituting 'pattern' for 'replacement'
# format: {'pattern': 'replacement'} - may contain more than one key-value pair
REFINERY_FILE_SOURCE_MAP = get_setting("REFINERY_FILE_SOURCE_MAP")

# data file import directory; it should be located on the same partition as
# FILE_STORE_DIR and MEDIA_ROOT to make import operations fast
REFINERY_DATA_IMPORT_DIR = get_setting("REFINERY_DATA_IMPORT_DIR")

# location of the Solr server (must be accessible from the web browser)
REFINERY_SOLR_BASE_URL = get_setting("REFINERY_SOLR_BASE_URL")

# used to replaces spaces in the names of dynamic fields in Solr indexing
REFINERY_SOLR_SPACE_DYNAMIC_FIELDS = get_setting(
    "REFINERY_SOLR_SPACE_DYNAMIC_FIELDS")

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

# list of paths to CSS files used to style Refinery pages
# (relative to STATIC_URL)
REFINERY_CSS = ["styles/refinery-style-bootstrap.css",
                "styles/refinery-style-bootstrap-responsive.css",
                "styles/refinery-style.css",
                "vendor/fontawesome/css/font-awesome.min.css"]

# set height of navigation bar (e.g. to fit a logo)
REFINERY_INNER_NAVBAR_HEIGHT = get_setting("REFINERY_INNER_NAVBAR_HEIGHT")

# supply a path to a logo that will become part of the branding
# (see navbar height correctly!)
# Set to `false` to disable Refinery's default logotype.
REFINERY_MAIN_LOGO = get_setting("REFINERY_MAIN_LOGO")

# supply a Google analytics id "UA-..."
# (if set to "" tracking will be deactivated)
REFINERY_GOOGLE_ANALYTICS_ID = get_setting("REFINERY_GOOGLE_ANALYTICS_ID")

# dump of the entire NCBI taxonomy archive
TAXONOMY_URL = "ftp://ftp.ncbi.nih.gov/pub/taxonomy/taxdump.tar.gz"

# table of UCSC genomes and their corresponding organisms
UCSC_URL = "hgdownload.cse.ucsc.edu/admin/hgcentral.sql"

# Tag for repository mode
REFINERY_REPOSITORY_MODE = get_setting("REFINERY_REPOSITORY_MODE")

# Message to be displayed near the top of every page (HTML allowed)
REFINERY_BANNER = get_setting("REFINERY_BANNER")

# Display REFINERY_BANNER to anonymous users only
REFINERY_BANNER_ANONYMOUS_ONLY = get_setting("REFINERY_BANNER_ANONYMOUS_ONLY")

# Setting to allow users to select if they want to keep workflows,
# histories, and libraries in Galaxy or not.
# Deletion options are ALWAYS, ON_SUCCESS, and NEVER
REFINERY_GALAXY_ANALYSIS_CLEANUP = get_setting(
    "REFINERY_GALAXY_ANALYSIS_CLEANUP")
# Subject and message body of the welcome email sent to new users
REFINERY_WELCOME_EMAIL_SUBJECT = get_setting("REFINERY_WELCOME_EMAIL_SUBJECT")
REFINERY_WELCOME_EMAIL_MESSAGE = get_setting("REFINERY_WELCOME_EMAIL_MESSAGE")

# Use external authentication system like django-auth-ldap (disables password
# management URLs)
REFINERY_EXTERNAL_AUTH = get_setting("REFINERY_EXTERNAL_AUTH")
# Message to display on password management pages when REFINERY_EXTERNAL_AUTH
# is set to True
REFINERY_EXTERNAL_AUTH_MESSAGE = get_setting("REFINERY_EXTERNAL_AUTH_MESSAGE")

"""
# external tool status settings
INTERVAL_BETWEEN_CHECKS = get_setting("INTERVAL_BETWEEN_CHECKS")
TIMEOUT = get_setting("TIMEOUT")
"""

# Directory for custom libraries
LIBS_DIR = get_setting("LIBS_DIR")

# Java settings
JAVA_ENTITY_EXPANSION_LIMIT = get_setting("JAVA_ENTITY_EXPANSION_LIMIT")

if REFINERY_EXTERNAL_AUTH:
    # enable LDAP authentication
    try:
        from django_auth_ldap.config import LDAPSearch
    except ImportError:
        logger.info("Failed to configure LDAP authentication")
    else:
        AUTH_LDAP_SERVER_URI = get_setting("AUTH_LDAP_SERVER_URI")
        AUTH_LDAP_BIND_DN = get_setting("AUTH_LDAP_BIND_DN")
        AUTH_LDAP_BIND_PASSWORD = get_setting("AUTH_LDAP_BIND_PASSWORD")
        AUTH_LDAP_USER_SEARCH = LDAPSearch(get_setting("AUTH_LDAP_BASE_DN"),
                                           get_setting("AUTH_LDAP_SCOPE"),
                                           get_setting("AUTH_LDAP_FILTERSTR"))
        # populate Django user profile from the LDAP directory
        AUTH_LDAP_USER_ATTR_MAP = get_setting("AUTH_LDAP_USER_ATTR_MAP")
        AUTHENTICATION_BACKENDS += (
            'core.models.RefineryLDAPBackend',
        )

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
        'LOCATION': '0.0.0.0:11211',
        'TIMEOUT': 600,
    }
}

# CURRENT_COMMIT retrieves the most recent commit used allowing for easier
# debugging of a Refinery instance

try:
    # TODO: use option -C (removed as a temp workaround for compatibility
    # with an old version of git)
    CURRENT_COMMIT = subprocess.check_output([
        '/usr/bin/git',
        '--git-dir', os.path.join(BASE_DIR, '.git'),
        '--work-tree', BASE_DIR,
        'rev-parse', 'HEAD'
    ])

except (ValueError, subprocess.CalledProcessError) as exc:
    logger.debug("Error retrieving hash of the most recent commit: %s",
                 exc)
    CURRENT_COMMIT = ""

# Neo4J Settings
NEO4J_BASE_URL = "http://localhost:7474"
NEO4J_CONSTRAINTS = [
    {
        "label": "Class",
        "properties": [
            {
                "name": "name",
                "unique": False
            },
            {
                "name": "uri",
                "unique": True
            }
        ]
    },
    {
        "label": "Ontology",
        "properties": [
            {
                "name": "acronym",
                "unique": True
            },
            {
                "name": "uri",
                "unique": True
            }
        ]
    },
    {
        "label": "User",
        "properties": [
            {
                "name": "id",
                "unique": True
            }
        ]
    },
    {
        "label": "DataSet",
        "properties": [
            {
                "name": "id",
                "unique": True
            }
        ]
    }
]

SOLR_SYNONYMS = get_setting("SOLR_SYNONYMS")
SOLR_LIB_DIR = get_setting("SOLR_LIB_DIR")
SOLR_CUSTOM_SYNONYMS_FILE = get_setting("SOLR_CUSTOM_SYNONYMS_FILE")

REFINERY_URL_SCHEME = get_setting("REFINERY_URL_SCHEME")
