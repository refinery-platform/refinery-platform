'''
Copied from create_user.py by drj on 2016-03-21
'''
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Activate user account"

    def add_arguments(self, parser):
        parser.add_argument('username')

    def handle(self, *args, **options):
        """Activate a user account.
        """
        username = options['username']
        User.objects.filter(username__exact=username).update(is_active=True)
