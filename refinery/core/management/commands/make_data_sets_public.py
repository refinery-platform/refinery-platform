from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from guardian.shortcuts import assign_perm

from core.models import DataSet, ExtendedGroup


class Command(BaseCommand):
    args = "<username>"
    help = "Make data sets of a user public (useful after batch imports)"

    def handle(self, *args, **options):
        try:
            user = User.objects.get(username=args[0])
        except User.DoesNotExist:
            raise CommandError("User '%s' does not exist" % args[0])
        public_group = ExtendedGroup.objects.public_group()
        for dataset in DataSet.objects.all():
            if user == dataset.get_owner():
                assign_perm('read_dataset', public_group, dataset)
                self.stdout.write("Making public data set '%s'" % dataset.name)
