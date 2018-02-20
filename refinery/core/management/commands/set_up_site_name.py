import sys

from django.conf import settings
from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Sets up the SITE_NAME for a Refinery installation:\n"
    help += ("- Usage: python manage.py init_refinery <site name> "
             "<site base URL>")
    """
    Name: handle
    Description:
    main program; run the command
    """
    def add_arguments(self, parser):
        parser.add_argument('refinery_instance_name')
        parser.add_argument('refinery_base_url')

    def handle(self, *args, **options):
        try:
            refinery_instance_name = options['refinery_instance_name']
            refinery_base_url = options['refinery_base_url']
        except:
            raise CommandError(
                "Insufficient arguments provided:\n {}".format(self.help)
            )
        else:
            set_up_site_name(refinery_instance_name, refinery_base_url)


def set_up_site_name(refinery_instance_name, refinery_base_url):
    """Set up the site name
    """
    site_obj, created = Site.objects.get_or_create(id=settings.SITE_ID)
    site_obj.name = refinery_instance_name
    site_obj.domain = refinery_base_url
    site_obj.save()
    sys.stdout.write("Created Site with name %s and base URL %s.\n" %
                     (site_obj.name, site_obj.domain))
