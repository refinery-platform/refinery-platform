"""
Created on Aug 23, 2012

@author: nils
"""

# a context processor to pass settings variables to views by default
# from: http://stackoverflow.com/q/433162

import json, logging
from django.conf import settings
from django.contrib.sites.models import Site
from django.core import serializers

logger = logging.getLogger(__name__)


def extra_context(context):
    site_model = serializers.serialize("json", Site.objects.all())

    ui_accessible_settings = {}

    # populate ui_accessible_settings based on the settings specified within
    # UI_ACCESSIBLE_SETTINGS in config.json
    for setting in settings.UI_ACCESSIBLE_SETTINGS:
        try:
            ui_accessible_settings[setting] = getattr(settings, setting)
        except AttributeError:
            logger.error("%s not found in config.json" % setting)

    # Add settings from the Site model
    ui_accessible_settings["REFINERY_BASE_URL"] = json.loads(site_model)[
        0]["fields"]["domain"]
    ui_accessible_settings["REFINERY_INSTANCE_NAME"] = json.loads(
        site_model)[0]["fields"]["name"]
    # Allow for access within js i.e. refinerySettings.ADMINS[0][1]
    ui_accessible_settings["refinerySettings"] = json.dumps(
        ui_accessible_settings)

    return ui_accessible_settings
