import sys

from django.conf import settings
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from django.db import connection

from core.models import ExtendedGroup


class Command(BaseCommand):
    help = "Sets up the SITE_NAME for a Refinery installation:\n"
    help += ("- Usage: python manage.py init_refinery <site name> "
             "<site base URL>")
    """
    Name: handle
    Description:
    main program; run the command
    """

    def handle(self, *args, **options):
        create_public_group()


def create_public_group():
    """Create public group"""
    sys.stdout.write(
        "Creating public group '{}' for Refinery. Edit "
        "'REFINERY_PUBLIC_GROUP_NAME' in your settings to choose another "
        "name or 'REFINERY_PUBLIC_GROUP_ID' to choose another id.".format(
            settings.REFINERY_PUBLIC_GROUP_NAME))
    # a. test if there is already a "group" of the same name
    if Group.objects.filter(
            name__exact=settings.REFINERY_PUBLIC_GROUP_NAME).count() > 0:
        sys.stdout.write(
            "A (standard) Django group named '{}' already exists.".format(
                settings.REFINERY_PUBLIC_GROUP_NAME)
        )
    elif Group.objects.filter(
            id=settings.REFINERY_PUBLIC_GROUP_ID).count() > 0:
        sys.stdout.write(
            "A (standard) Django group with id '{}' already exists.".format(
                settings.REFINERY_PUBLIC_GROUP_ID)
        )
    elif ExtendedGroup.objects.filter(
            name__exact=settings.REFINERY_PUBLIC_GROUP_NAME).count() > 0:
        sys.stdout.write(
            "A Refinery group named '{}' already exists.".format(
                settings.REFINERY_PUBLIC_GROUP_NAME)
        )
    elif ExtendedGroup.objects.filter(
            name__exact=settings.REFINERY_PUBLIC_GROUP_ID).count() > 0:
        sys.stdout.write(
            "A Refinery group with id '{}' already exists.".format(
                settings.REFINERY_PUBLIC_GROUP_ID)
        )
    else:
        ExtendedGroup.objects.create(
            id=settings.REFINERY_PUBLIC_GROUP_ID,
            name=settings.REFINERY_PUBLIC_GROUP_NAME, is_public=True)
        # in order to avoid clashes of group ids for groups created after the
        # creation of the public group we need to set the sequence for the
        # group ids to the public group id (this is not updated automatically
        # when the id is set explicitly)
        with connection.cursor() as cursor:
            cursor.execute("SELECT setval(\'auth_group_id_seq\', %s )",
                           (settings.REFINERY_PUBLIC_GROUP_ID,))
        sys.stdout.write("Successfully created group '{}'.".format(
            settings.REFINERY_PUBLIC_GROUP_NAME)
        )
