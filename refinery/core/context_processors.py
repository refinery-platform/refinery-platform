"""
Created on Aug 23, 2012

@author: nils
"""

# a context processor to pass settings variables to views by default
# from: http://stackoverflow.com/q/433162

import json
from django.conf import settings
from django.contrib.sites.models import Site
from django.core import serializers


def extra_context(context):
    site_model = serializers.serialize("json", Site.objects.all())

    class UI_ACCESSIBLE_SETTINGS:
        pass

    for setting in dir(settings):
        if setting in settings.UI_ACCESSIBLE_SETTINGS:
            setattr(UI_ACCESSIBLE_SETTINGS, setting, getattr(settings,
                                                             setting))

    setattr(UI_ACCESSIBLE_SETTINGS, "REFINERY_BASE_URL",
            json.loads(site_model)[0]["fields"]["domain"])
    setattr(UI_ACCESSIBLE_SETTINGS, "REFINERY_INSTANCE_NAME", json.loads(
        site_model)[0]["fields"]["name"])

    return {
        "refinerySettings": UI_ACCESSIBLE_SETTINGS.__dict__,
        "refinerySettingsObj": json.dumps(UI_ACCESSIBLE_SETTINGS.__dict__)
    }
