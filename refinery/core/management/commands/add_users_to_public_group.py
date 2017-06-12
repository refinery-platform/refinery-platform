from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "add all existing users to the public group:\n"
    """
    Name: handle
    Description:
    main program; run the command
    """
    def handle(self, *args, **options):

        add_users_to_public_group()


def add_users_to_public_group():
    """ Trigger post_save method on existing users so that they are added to
    the Public group.

    This is especially helpful if we add more users to default-users.json
    fixture because Django's loaddata mgmt. command does not trigger the User
    model's save() method.
    """

    for user in User.objects.all():
        user.save()
