'''
Copied from create_user.py by drj on 2016-03-21
'''

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Activate user account"

    def handle(self, username, **options):
        """Activate a user account.
        """

        User.objects.filter(username__exact=username).update(is_active=True)
