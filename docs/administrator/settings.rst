.. _settings:

Settings
========

Refinery settings are configured in ``settings_local.py``.

.. note::
   You should never edit the settings directly in ``settings.py`` to avoid conflicts when upgrading.

Database Settings
-----------------

``DATABASES``
	

Solr Settings
-------------

``REFINERY_SOLR_BASE_URL = "http://localhost:8983/solr/"``
	Location of the Solr API.
	
Email Settings
--------------

``EMAIL_HOST = 'localhost'``

``EMAIL_PORT = 25``

``DEFAULT_FROM_EMAIL = 'webmaster@localhost'``
 
``SERVER_EMAIL = 'root@localhost'``
	The email address that error messages come from, such as those sent to ADMINS and MANAGERS.


Customization Settings
----------------------

``TIME_ZONE = 'America/New_York'``
	Local time zone for this installation. Choices can be found at http://en.wikipedia.org/wiki/List_of_tz_zones_by_name,
	although not all choices may be available on all operating systems. On Unix systems, a value of None will cause Django to use the same
	timezone as the operating system. If running in a Windows environment this must be set to the same as your system time zone.	

``REFINERY_PUBLIC_GROUP_NAME = "Public"`` 
	Set the name of the group that is used to share data with all users (= "the public")
	
``REFINERY_PUBLIC_GROUP_ID = 100``
	**Do not change this after initialization** of your Refinery instance.

``ISA_TAB_DIR = ''``

``FILE_STORE_DIR = 'file_store'``
	Location of the file store data directory relative to ``MEDIA_ROOT``.

``REFINERY_SOLR_SPACE_DYNAMIC_FIELDS = "_"``
	Used to replaces spaces in the names of dynamic fields in Solr indexing.

``REFINERY_CSS = ["styles/css/refinery-style-bootstrap.css", "styles/css/refinery-style-bootstrap-responsive.css", "styles/css/refinery-style.css" ]``
	List of paths to CSS files used to style Refinery pages (relative to STATIC_URL)
 
``REFINERY_GOOGLE_ANALYTICS_ID = ""``
	Supply a Google analytics id "UA-..." (if set to "" tracking will be deactivated).
	
``EMAIL_SUBJECT_PREFIX = '[Refinery] '``
	Prefix for emails sent by Refinery. Should always end with a space.

``REFINERY_REPOSITORY_MODE = False``
	Set to ``True`` to activate Refinery repository mode.

``ACCOUNT_ACTIVATION_DAYS = 7``
	Number of days user has to activate their account before it expires.

``REFINERY_WELCOME_EMAIL_SUBJECT = 'Welcome to Refinery'``
	Subject of the welcome email sent to new users.

``REFINERY_WELCOME_EMAIL_MESSAGE = 'Please fill out your user profile'``
	Message body of the welcome email sent to new users.

``REFINERY_FILE_SOURCE_MAP = {}``
   Optional dictionary for translating file URLs into file system paths (and vice versa)
   format: *{'pattern': 'replacement'}*
   where *pattern* is a string to search for in source and then replace with *replacement* string.
   May contain more than one pattern-replacement pair (only the first match will be used).

``REFINERY_BANNER = ''``
   Optional string to display a message near the top of every page (HTML tags allowed).

``REFINERY_BANNER_ANONYMOUS_ONLY = False``
   Optional setting to display REFINERY_BANNER to anonymous users only.

``REFINERY_REGISTRATION_CLOSED_MESSAGE = ''``
   Optional string to display a message when REGISTRATION_OPEN = False (HTML tags allowed).
 
``REFINERY_INNER_NAVBAR_HEIGHT = 20``
   Set height of navigation bar (e.g. to fit a logo).
	
``REFINERY_MAIN_LOGO = ""``
   Supply a path to a logo that will become part of the branding (set navbar height correctly!)

``REFINERY_EXTERNAL_AUTH = False``
   Use external authentication system like django-auth-ldap (disables password management URLs)

``REFINERY_EXTERNAL_AUTH_MESSAGE = ''``
   Message to display on password management pages when REFINERY_EXTERNAL_AUTH = True

``TAXONOMY_URL = "ftp://ftp.ncbi.nih.gov/pub/taxonomy/taxdump.tar.gz"``
   Location of the zip file that contains the entire NCBI taxonomy database 

``UCSC_URL = "hgdownload.cse.ucsc.edu/admin/hgcentral.sql"``
   Database of all UCSC genomes, alternate names, and their corresponding organisms.

``AE_BASE_QUERY = 'http://www.ebi.ac.uk/arrayexpress/xml/v2/experiments?'``
   Base query for what kind of ArrayExpress studies to pull in (e.g. only ChIP-Seq studies, or studies updated after a certain date)

``AE_BASE_URL = "http://www.ebi.ac.uk/arrayexpress/experiments"``
   prefix of the URL where all ArrayExpress studies' MAGE-TAB files can be accessed   


Authentication settings
-----------------------
Example for user authentication via LDAP using django-auth-ldap_:

.. _django-auth-ldap: http://pythonhosted.org/django-auth-ldap/

::

   from django_auth_ldap.config import LDAPSearch
   # Baseline configuration
   AUTH_LDAP_SERVER_URI = "ldap://ldap.example.com"
   AUTH_LDAP_BIND_DN = ""
   AUTH_LDAP_BIND_PASSWORD = ""
   AUTH_LDAP_USER_SEARCH = LDAPSearch("OU=Domain Users,DC=rc,DC=Domain",
                                   ldap.SCOPE_SUBTREE, "(uid=%(user)s)")
   # Populate Django user from the LDAP directory.
   AUTH_LDAP_USER_ATTR_MAP = {
      "first_name": "givenName",
      "last_name": "sn",
      "email": "mail"
   }
   settings.AUTHENTICATION_BACKENDS += (
       'refinery.core.models.RefineryLDAPBackend',
   )
