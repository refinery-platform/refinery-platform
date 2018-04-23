from datetime import timedelta
import json
import logging
import os
import subprocess
import urlparse

from django.core.exceptions import ImproperlyConfigured
from django.core.files.storage import FileSystemStorage

import djcelery
import yaml

logger = logging.getLogger(__name__)

# get the absolute path of the top level project dir
BASE_DIR = os.path.normpath(os.path.join(os.path.abspath(__file__),
                                         "../../../.."))

local_settings_file_path = os.path.join(BASE_DIR,
                                        'refinery/config/config.json')

tutorial_settings_file_path = os.path.join(
    BASE_DIR,
    'refinery/config/tutorial_steps.json'
)

override_path = os.path.join(BASE_DIR, 'refinery/config/override-config.yaml')

# load config.json
try:
    with open(local_settings_file_path, 'r') as f:
        local_settings = json.load(f)
except IOError as e:
    error_msg = "Could not open '{}': {}".format(local_settings_file_path, e)
    raise ImproperlyConfigured(error_msg)

# load tutorial_steps.json
try:
    with open(tutorial_settings_file_path, 'r') as f:
        refinery_tutorial_settings = json.dumps(json.load(f))
except IOError as e:
    error_msg = "Could not open '{}': {}".format(
        tutorial_settings_file_path, e
    )
    raise ImproperlyConfigured(error_msg)

# load (optional) override-config.yaml
try:
    with open(override_path, 'r') as f:
        override = yaml.load(f)
    local_settings.update(override)
except IOError:
    pass


def get_setting(name, settings=local_settings, default=None):
    """Get the local settings variable or return explicit exception"""
    try:
        return settings[name]
    except KeyError:
        if default is not None:
            return default
        else:
            raise ImproperlyConfigured("Missing setting '{0}'".format(name))


# TODO: remove after switching to the new Celery API
djcelery.setup_loader()

# a tuple that lists people who get code error notifications
# (convert JSON list of lists to tuple of tuples)
ADMINS = tuple(map(tuple, get_setting("ADMINS")))

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

DEFAULT_FILE_STORAGE = 'file_store.utils.SymlinkedFileSystemStorage'

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

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(BASE_DIR, "refinery/templates"),
            # Put strings here, like "/home/html/django_templates" or
            # "C:/www/django/templates".
            # Always use forward slashes, even on Windows.
            # Don't forget to use absolute paths, not relative paths.
        ],
        'OPTIONS': {
            'loaders': (
                'django.template.loaders.filesystem.Loader',
                'django.template.loaders.app_directories.Loader',
                # 'django.template.loaders.eggs.Loader',
            ),
            'context_processors': [
                'core.context_processors.extra_context',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.template.context_processors.debug',
                'django.template.context_processors.i18n',
                'django.template.context_processors.media',
                'django.template.context_processors.static',
                'django.template.context_processors.tz',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
)

ROOT_URLCONF = 'config.urls'

# NOTE: the order of INSTALLED_APPS matters in some instances.
INSTALLED_APPS = (
    'django.contrib.sites',
    'registration',  # docs: should be immediately above 'django.contrib.auth'
    'django.contrib.auth',
    'core',
    'data_set_manager',
    'guardian',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
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
    'djangular',
    'galaxy_connector',
    'analysis_manager',
    'file_store',
    'annotation_server',
    'selenium_testing',
    'tool_manager',
    'flatblocks',
    'chunked_upload',
    'rest_framework',
    'rest_framework_swagger',
    'django_docker_engine',
    'httpproxy',
)

# NG: added for django-guardian
AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',  # default
    'guardian.backends.ObjectPermissionBackend',
)

# NG: added to support sessions
SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
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
            'level': get_setting("REFINERY_LOG_LEVEL"),
            'class': 'logging.StreamHandler',
            'formatter': 'default'
        },
    },
    'loggers': {
        'django': {
            'level': 'WARNING',
            'handlers': ['mail_admins'],
        },
        'boto3': {
            'level': 'INFO',
        },
        'botocore': {
            'level': 'INFO',
        },
        'docker': {
            'level': 'ERROR',
        },
        'easyprocess': {
            'level': 'ERROR',
        },
        'factory': {
            'level': 'ERROR',
        },
        'httpproxy': {
            'level': 'ERROR',
        },
        'httpstream': {  # dependency of py2neo
            'level': 'INFO',
        },
        'pysolr': {
            'level': 'INFO',
        },
        'requests': {
            'level': 'ERROR',
        },
        'selenium': {
            'level': 'ERROR',
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

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# for external functions called in Celery tasks
CELERYD_LOG_FORMAT = '%(asctime)s %(levelname)-8s %(name)s:%(lineno)s ' \
                     '%(funcName)s() - %(message)s'
CELERYD_TASK_LOG_FORMAT = '%(asctime)s %(levelname)-8s %(name)s:%(lineno)s ' \
                          '%(funcName)s[%(task_id)s] - %(message)s'
# for system stability
CELERYD_MAX_TASKS_PER_CHILD = get_setting("CELERYD_MAX_TASKS_PER_CHILD")
CELERY_ROUTES = {"file_store.tasks.import_file": {"queue": "file_import"}}
CELERY_ACCEPT_CONTENT = ['pickle']
CELERYBEAT_SCHEDULE = {
    'collect_site_statistics': {
        'task': 'core.tasks.collect_site_statistics',
        'schedule': timedelta(days=1),
        'options': {
            'expires': 30,  # seconds
        }
    },
    'django_docker_cleanup': {
        'task': 'tool_manager.tasks.django_docker_cleanup',
        'schedule': timedelta(seconds=30),
        'options': {
            'expires': 20,  # seconds
        }
    },
}

CHUNKED_UPLOAD_ABSTRACT_MODEL = False
# keep chunked uploads outside the file_store directory
CHUNKED_UPLOAD_STORAGE_CLASS = FileSystemStorage

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

# relative to MEDIA_ROOT
FILE_STORE_DIR = get_setting('FILE_STORE_DIR', default='file_store')
# absolute path to the file store root dir
FILE_STORE_BASE_DIR = os.path.join(MEDIA_ROOT, FILE_STORE_DIR)
FILE_STORE_TEMP_DIR = os.path.join(FILE_STORE_BASE_DIR, 'temp')
# for SymlinkedFileSystemStorage (http://stackoverflow.com/q/4832626)
FILE_STORE_BASE_URL = urlparse.urljoin(MEDIA_URL, FILE_STORE_DIR) + '/'
# move uploaded files into file store quickly instead of copying
FILE_UPLOAD_TEMP_DIR = get_setting('FILE_UPLOAD_TEMP_DIR',
                                   default=FILE_STORE_TEMP_DIR)
# always keep uploaded files on disk
FILE_UPLOAD_MAX_MEMORY_SIZE = get_setting('FILE_UPLOAD_MAX_MEMORY_SIZE',
                                          default=0)

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
        # Haystack requires a default, but there's less risk of confusion
        # for us if the core is explicit on each call.
        # So: Leave this in, but it's just a placeholder.
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
                "vendor/fontawesome/css/font-awesome.min.css",
                "vendor/intro-js/minified/introjs.min.css"]

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


# Setting to determine when we should generate index files for
# viszualization purposes. Possible values are "on_file_import" or
# "never"
REFINERY_AUXILIARY_FILE_GENERATION = get_setting(
    "REFINERY_AUXILIARY_FILE_GENERATION")

REFINERY_TUTORIAL_STEPS = refinery_tutorial_settings

ANONYMOUS_USER_ID = -1

SATORI_DEMO = get_setting("SATORI_DEMO", local_settings, False)

AUTO_LOGIN = get_setting("AUTO_LOGIN", local_settings, [])

TEST_RUNNER = "django.test.runner.DiscoverRunner"

# Required for pre-Django 1.9 TransactionTestCases utilizing
# `serialized_rollback` to function properly.
# https://code.djangoproject.com/ticket/23727#comment:13
TEST_NON_SERIALIZED_APPS = ['core', 'django.contrib.contenttypes',
                            'django.contrib.auth']

# To avoid Port conflicts between LiveServerTestCases
# https://docs.djangoproject.com/en/1.7/topics/testing/tools/#liveservertestcase
os.environ["DJANGO_LIVE_TEST_SERVER_ADDRESS"] = "localhost:10000-12000"

DJANGO_DOCKER_ENGINE_MAX_CONTAINERS = 10
DJANGO_DOCKER_ENGINE_BASE_URL = "visualizations"
# Time in seconds to wait before killing unused visualization
DJANGO_DOCKER_ENGINE_SECONDS_INACTIVE = 60 * 60
DJANGO_DOCKER_ENGINE_DATA_DIR = get_setting("DJANGO_DOCKER_ENGINE_DATA_DIR")

REFINERY_DEPLOYMENT_PLATFORM = "vagrant"

# HTML-safe item to be displayed to the right of the `About` link in the navbar
REFINERY_CUSTOM_NAVBAR_ITEM = get_setting("REFINERY_CUSTOM_NAVBAR_ITEM")

USER_FILES_COLUMNS = get_setting("USER_FILES_COLUMNS")
USER_FILES_FACETS = get_setting("USER_FILES_FACETS")

MEDIA_BUCKET = ''  # a placeholder for use in context processor
UPLOAD_BUCKET = ''  # a placeholder for use in context processor

TASTYPIE_DEFAULT_FORMATS = ['json']

# temporary feature toggle for using S3 as user data file storage backend
REFINERY_S3_USER_DATA = get_setting('REFINERY_S3_USER_DATA', default=False)

# ALLOWED_HOSTS required in 1.8.16 to prevent a DNS rebinding attack.
ALLOWED_HOSTS = get_setting("ALLOWED_HOSTS")

MIGRATION_MODULES = {
    'chunked_upload': 'dependency_migrations.chunked_upload'
}
REFINERY_VISUALIZATION_REGISTRY = \
    "https://github.com/refinery-platform/visualization-tools/"
