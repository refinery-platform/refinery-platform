'''
Created on Aug 23, 2012

@author: nils
'''

# a context processor to pass settings variables to views by default
# from: http://stackoverflow.com/questions/433162/can-i-access-constants-in-settings-py-from-templates-in-django?lq=1

from django.conf import settings
from django.contrib.sites.models import Site

def extra_context(context):
    # return the value you want as a dictionnary. you may add multiple values in there.
    return {
        "REFINERY_CSS": settings.REFINERY_CSS,
        "REFINERY_MAIN_LOGO": settings.REFINERY_MAIN_LOGO,
        "REFINERY_INNER_NAVBAR_HEIGHT": settings.REFINERY_INNER_NAVBAR_HEIGHT, 
        "REFINERY_BASE_URL": settings.REFINERY_BASE_URL,
        "REFINERY_SOLR_BASE_URL": settings.REFINERY_SOLR_BASE_URL,
        "REFINERY_GOOGLE_ANALYTICS_ID": settings.REFINERY_GOOGLE_ANALYTICS_ID,
        "REFINERY_INSTANCE_NAME": Site.objects.get_current().name,
        "REFINERY_REPOSITORY_MODE": settings.REFINERY_REPOSITORY_MODE,
    }