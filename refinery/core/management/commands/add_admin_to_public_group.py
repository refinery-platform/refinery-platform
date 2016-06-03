import sys
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from core.models import ExtendedGroup


class Command(BaseCommand):
    help = "Sets up the admin user for a Refinery installation:\n"
    """
    Name: handle
    Description:
    main program; run the command
    """
    def handle(self, *args, **options):

        add_admin_to_public_group()


def add_admin_to_public_group():
    """Test if admin users exist and add to public group if they do
    """
    for user in User.objects.all():
        if user.is_superuser:
            public_group = ExtendedGroup.objects.public_group()
            if public_group:
                public_group.user_set.add(user)
                public_group.save()
                sys.stdout.write("Admin user exists and has been added to "
                                 "the Public Group.\n")
