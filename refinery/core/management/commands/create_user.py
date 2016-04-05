'''
Created on Oct 3, 2012

@author: nils
'''

import logging

from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Creates a %s user account." % Site.objects.get_current().name
    """
    Name: handle
    Description:
    main program; run the command
    """
    def handle(self, username, password, email, first_name, last_name,
               affiliation, **options):
        """create a user account for Refinery
        """
        # delete if exists
        user_object = User.objects.filter(username__exact=username)
        if len(user_object) > 0:
            error_msg = "User {} already exists. " \
                        "Please delete the account and try again."\
                        .format(username)
            print error_msg
            logger.error(error_msg)
            return
        init_user(
            username, password, email, first_name, last_name, affiliation)


def init_user(username, password, email, first_name, last_name, affiliation):
    """Create a new User instance with specified values
    """
    user_object = User.objects.create_user(
        username, email=email, password=password)
    user_object.first_name = first_name
    user_object.last_name = last_name
    user_object.get_profile().affiliation = affiliation
    user_object.save()
    user_object.get_profile().save()

    success_msg = "User {} created.".format(username)
    print(success_msg)
    logger.info(success_msg)
