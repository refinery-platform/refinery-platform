'''
Created on Jun 28, 2012

@author: nils
'''

import sys

from django.conf import settings
from django.contrib.auth.models import Group, User
from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand
from django.db import connection, transaction

from core.models import ExtendedGroup


class Command(BaseCommand):
    help = "Initializes a Refinery installation:\n"
    help += ("- tests if admin user exists and if none exists, asks user to "
             "create one\n - assigns the user-provided name of the website "
             "and base URL for use throughout Refinery\n - generates the "
             "Public group and the Public Manager group and adds the admin "
             "user to it\n\nUsage: python manage.py init_refinery <site name> "
             "<site base URL>")
    """
    Name: handle
    Description:
    main program; run the command
    """
    def handle(self, *args, **options):
        try:
            refinery_instance_name = args[0]
            refinery_base_url = args[1]
        except:
            print "Insufficient arguments provided:\n%s" % self.help
            sys.exit(2)
        set_up_site_name(refinery_instance_name, refinery_base_url)
        create_public_group()
        test_admin_user()


def test_admin_user():
    """Test if admin user exists and add to public group if they do
    """
    for user in User.objects.all():
        if user.is_superuser:
            public_group = ExtendedGroup.objects.public_group()
            if public_group:
                user.groups.add(public_group)
            print "Admin user exists and has been added to the Public Group.\n"


def set_up_site_name(refinery_instance_name, refinery_base_url):
    """Set up the site name
    """
    site_obj, created = Site.objects.get_or_create(id=settings.SITE_ID)
    site_obj.name = refinery_instance_name
    site_obj.domain = refinery_base_url
    site_obj.save()
    print "Created Site with name %s and base URL %s.\n" % \
          (site_obj.name, site_obj.domain)


def create_public_group():
    """Create public group
    """
    print("Creating public group '%s' for Refinery. "
          "Edit 'REFINERY_PUBLIC_GROUP_NAME' in your settings to choose "
          "another name or 'REFINERY_PUBLIC_GROUP_ID' to choose another id."
          % settings.REFINERY_PUBLIC_GROUP_NAME)
    # a. test if there is already a "group" of the same name
    if Group.objects.filter(
            name__exact=settings.REFINERY_PUBLIC_GROUP_NAME).count() > 0:
        print("A (standard) Django group named '%s' already exists." %
              settings.REFINERY_PUBLIC_GROUP_NAME)
    elif Group.objects.filter(
            id=settings.REFINERY_PUBLIC_GROUP_ID).count() > 0:
        print("A (standard) Django group with id '%s' already exists." %
              settings.REFINERY_PUBLIC_GROUP_ID)
    elif ExtendedGroup.objects.filter(
            name__exact=settings.REFINERY_PUBLIC_GROUP_NAME).count() > 0:
        print("A Refinery group named '%s' already exists." %
              settings.REFINERY_PUBLIC_GROUP_NAME)
    elif ExtendedGroup.objects.filter(
            name__exact=settings.REFINERY_PUBLIC_GROUP_ID).count() > 0:
        print("A Refinery group with id '%s' already exists." %
              settings.REFINERY_PUBLIC_GROUP_ID)
    else:
        ExtendedGroup.objects.create(
            id=settings.REFINERY_PUBLIC_GROUP_ID,
            name=settings.REFINERY_PUBLIC_GROUP_NAME, is_public=True)
        # in order to avoid clashes of group ids for groups created after the
        # creation of the public group we need to set the sequence for the
        # group ids to the public group id (this is not updated automatically
        # when the id is set explicitly)
        cursor = connection.cursor()
        cursor.execute("SELECT setval(\'auth_group_id_seq\', %s )",
                       (settings.REFINERY_PUBLIC_GROUP_ID,))
        transaction.commit_unless_managed()
        print("Successfully created group '%s'." %
              settings.REFINERY_PUBLIC_GROUP_NAME)
