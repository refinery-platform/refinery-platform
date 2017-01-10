from django.core.management.base import BaseCommand

from data_set_manager.models import Investigation


class Command(BaseCommand):
    help = (
        'Helper command to update the investigation of MetaboLights data '
        'sets.'
    )

    def handle(self, *args, **options):
        for inv in Investigation.objects.all():
            try:
                study = inv.study_set.all()[0]
            except Exception:
                continue

            if (
                inv.identifier is None or
                inv.identifier == ''
            ):
                inv.identifier = study.identifier

            if (
                inv.title is None or
                inv.title == '' or
                inv.title == 'Investigation'
            ):
                inv.title = study.title

            if inv.description is None or inv.description == '':
                inv.description = study.description

            inv.save()
