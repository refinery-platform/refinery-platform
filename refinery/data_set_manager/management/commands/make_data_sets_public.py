from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from core.models import DataSet, ExtendedGroup


class Command(BaseCommand):
    args = "<username>"
    help = "Make data sets of a user public (useful after batch imports)"

    def handle(self, *args, **options):
        try:
            user = User.objects.get(username=args[0])
        except User.DoesNotExist:
            raise CommandError("User '%s' does not exist" % args[0])
        except IndexError:
            raise CommandError("Please provide a username")
        public_group = ExtendedGroup.objects.public_group()
        # TODO: optimize retrieving user's data sets
        for data_set in DataSet.objects.all():
            if user == data_set.get_owner():
                self.stdout.write(
                    "Making public data set '%s'" % data_set.name)
                data_set.share(public_group)
