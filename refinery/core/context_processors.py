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

    class UiAccessibleSettings:
        pass

    for setting in dir(settings):
        if setting in settings.UI_ACCESSIBLE_SETTINGS:
            setattr(UiAccessibleSettings, setting, getattr(settings, setting))

    setattr(UiAccessibleSettings, "REFINERY_BASE_URL",
            json.loads(site_model)[0]["fields"]["domain"])
    setattr(UiAccessibleSettings, "REFINERY_INSTANCE_NAME", json.loads(
        site_model)[0]["fields"]["name"])

    return {
        "refinerySettings": UiAccessibleSettings.__dict__,
        "refinerySettingsObj": json.dumps(UiAccessibleSettings.__dict__)
    }
