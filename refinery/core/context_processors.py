"""
Created on Aug 23, 2012

@author: nils
"""

# a context processor to pass settings variables to views by default
# from: http://stackoverflow.com/q/433162

import json
import logging

from django.conf import settings
from django.contrib.sites.models import Site
from django.core import serializers

logger = logging.getLogger(__name__)


def extra_context(context):
    site_model = serializers.serialize("json", Site.objects.all())

    ui_accessible_settings = {}

    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    # WARNING: Be careful adding Django settings to this list as
    # `globally_available_settings` does exactly as it states and exposes each
    #  of these settings to the javascript console!
    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    globally_available_settings = [
                                 "ADMINS",
                                 "CURRENT_COMMIT",
                                 "REFINERY_CSS",
                                 "REFINERY_MAIN_LOGO",
                                 "REFINERY_INNER_NAVBAR_HEIGHT",
                                 "REFINERY_BASE_URL",
                                 "REFINERY_SOLR_BASE_URL",
                                 "REFINERY_GOOGLE_ANALYTICS_ID",
                                 "REFINERY_INSTANCE_NAME",
                                 "REFINERY_REPOSITORY_MODE",
                                 "REFINERY_CONTACT_EMAIL",
                                 "REGISTRATION_OPEN",
                                 "REFINERY_REGISTRATION_CLOSED_MESSAGE",
                                 "ACCOUNT_ACTIVATION_DAYS",
                                 "REFINERY_BANNER",
                                 "REFINERY_BANNER_ANONYMOUS_ONLY",
                                 "REFINERY_EXTERNAL_AUTH",
                                 "REFINERY_EXTERNAL_AUTH_MESSAGE",
                                 "STATIC_URL"
                             ]

    # populate ui_accessible_settings based on the settings specified within
    # UI_ACCESSIBLE_SETTINGS in config.json
    for setting in globally_available_settings:
        try:
            ui_accessible_settings[setting] = getattr(settings, setting)
        except AttributeError:
            logger.warn("%s not found in config.json" % setting)

    # Add settings from the Site model
    ui_accessible_settings["REFINERY_BASE_URL"] = json.loads(site_model)[
        0]["fields"]["domain"]
    ui_accessible_settings["REFINERY_INSTANCE_NAME"] = json.loads(
        site_model)[0]["fields"]["name"]
    # Allow for access within js i.e. refinerySettings.ADMINS[0][1]
    ui_accessible_settings["refinerySettings"] = json.dumps(
        ui_accessible_settings)

    return ui_accessible_settings
