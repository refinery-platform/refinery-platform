from django.core.management.base import BaseCommand

from core.models import DataSet


class Command(BaseCommand):
    help = (
        'Helper command to pull missing information of data sets from '
        'its investigation.'
    )

    def handle(self, *args, **options):
        for ds in DataSet.objects.all():
            try:
                inv = ds.investigationlink_set.first().investigation
            except Exception:
                continue

            if ds.accession is None or ds.accession == '':
                ds.accession = inv.identifier

            if (
                ds.title is None or
                ds.title == '' or
                ds.title == 'Investigation'
            ):
                ds.title = inv.title

            try:
                ds.name = '%s: %s' % (ds.accession, ds.title)
            except Exception:
                continue

            if ds.description is None or ds.description == '':
                ds.description = inv.description

            ds.save()
