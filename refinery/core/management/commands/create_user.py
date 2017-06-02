'''
Created on Oct 3, 2012

@author: nils
'''
import sys

from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Creates a %s user account." % Site.objects.get_current().name
    """
    Name: handle
    Description:
    main program; run the command
    """
    def handle(self, username, password, email, first_name, last_name,
               affiliation, is_active=False, **options):
        """Create a user account for Refinery (user is inactive).
        """

        # delete if exists
        user_object = User.objects.filter(username__exact=username)
        if len(user_object) > 0:
            error_msg = "User {} already exists. " \
                        "Please delete the account and try again."\
                        .format(username)
            sys.stderr.write(error_msg)
            return

        init_user(
            username, password, email, first_name, last_name, affiliation,
            is_active=bool(is_active))


def init_user(username, password, email, first_name, last_name, affiliation,
              is_active=True):
    """Create a new User instance with specified values.
    """
    user_object = User.objects.create_user(
        username, email=email, password=password)
    user_object.first_name = first_name
    user_object.last_name = last_name
    user_object.profile.affiliation = affiliation
    user_object.is_active = is_active
    user_object.save()
    user_object.profile.save()

    success_msg = "User {} created.".format(username)
    sys.stdout.write(success_msg)
