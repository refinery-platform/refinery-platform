"""
Created on Aug 23, 2012

@author: nils
"""

# a context processor to pass settings variables to views by default
# from: http://stackoverflow.com/q/433162

import logging

from django.conf import settings
from django.contrib.sites.models import Site

logger = logging.getLogger(__name__)


def extra_context(context):
    """return values you want as a dictionary"""
    """!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    WARNING: Be careful adding Django settings to this dictionary as
    it exposes each of these settings to the template context/javascript
    console!
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    """
    return {
        "ADMIN_EMAIL": settings.ADMINS[0][1],
        "CURRENT_COMMIT": settings.CURRENT_COMMIT,
        "DEBUG": settings.DEBUG,
        "REFINERY_CSS": settings.REFINERY_CSS,
        "REFINERY_MAIN_LOGO": settings.REFINERY_MAIN_LOGO,
        "REFINERY_INNER_NAVBAR_HEIGHT": settings.REFINERY_INNER_NAVBAR_HEIGHT,
        "REFINERY_BASE_URL": Site.objects.get_current().domain,
        "REFINERY_SOLR_BASE_URL": settings.REFINERY_SOLR_BASE_URL,
        "REFINERY_GOOGLE_ANALYTICS_ID": settings.REFINERY_GOOGLE_ANALYTICS_ID,
        "REFINERY_INSTANCE_NAME": Site.objects.get_current().name,
        "REFINERY_REPOSITORY_MODE": settings.REFINERY_REPOSITORY_MODE,
        "REFINERY_CONTACT_EMAIL": settings.DEFAULT_FROM_EMAIL,
        "REGISTRATION_OPEN": settings.REGISTRATION_OPEN,
        "REFINERY_REGISTRATION_CLOSED_MESSAGE":
            settings.REFINERY_REGISTRATION_CLOSED_MESSAGE,
        "ACCOUNT_ACTIVATION_DAYS": settings.ACCOUNT_ACTIVATION_DAYS,
        "REFINERY_BANNER": settings.REFINERY_BANNER,
        "REFINERY_BANNER_ANONYMOUS_ONLY":
            settings.REFINERY_BANNER_ANONYMOUS_ONLY,
        "REFINERY_EXTERNAL_AUTH": settings.REFINERY_EXTERNAL_AUTH,
        "REFINERY_EXTERNAL_AUTH_MESSAGE":
            settings.REFINERY_EXTERNAL_AUTH_MESSAGE,
        "REFINERY_TUTORIAL_STEPS": settings.REFINERY_TUTORIAL_STEPS,
        "SOLR_SYNONYM_SEARCH": settings.SOLR_SYNONYMS
    }
