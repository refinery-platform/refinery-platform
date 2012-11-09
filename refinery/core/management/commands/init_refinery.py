'''
Created on Jun 28, 2012

@author: nils
'''

from core.models import ExtendedGroup
from django.conf import settings
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from django.contrib.sites.models import Site


class Command(BaseCommand):
    help = "Initializes a Refinery installation:"
    help = "%s - tests if admin user exists and if none exists, asks user to create one \n" % help
    help = "%s - generates the Public group and the Public Manager group and adds the admin user to it\n" % help    

    """
    Name: handle
    Description:
    main program; run the command
    """   
    def handle(self, **options):
        # 1. test if admin user exists
         
        # 2. set up the site name
        if Site.objects.filter(domain__exact=settings.REFINERY_BASE_URL).count() > 0:
            print("This URL already exists in the database")
#            raise CommandError("This URL already exists in the database")
        else:
            s = Site.objects.get(id=settings.SITE_ID)
            s.name = settings.REFINERY_INSTANCE_NAME
            s.domain = settings.REFINERY_BASE_URL
            s.save()

        # 3. create public group
        print("Creating public group '%s' for Refinery. Edit 'REFINERY_PUBLIC_GROUP_NAME' in your settings to choose another name or 'REFINERY_PUBLIC_GROUP_ID' to choose another id."
              % settings.REFINERY_PUBLIC_GROUP_NAME) 
        # a. test if there is already a "group" of the same name
        if Group.objects.filter( name__exact=settings.REFINERY_PUBLIC_GROUP_NAME ).count() > 0:
            print("A (standard) Django group named '%s' already exists." % settings.REFINERY_PUBLIC_GROUP_NAME)
#            raise CommandError( "A (standard) Django group named \"%s\" already exists. Remove this group and re-run this command." % settings.REFINERY_PUBLIC_GROUP_NAME )
        elif Group.objects.filter( id=settings.REFINERY_PUBLIC_GROUP_ID ).count() > 0:
            print("A (standard) Django group with id '%s' already exists." % settings.REFINERY_PUBLIC_GROUP_ID)
#            raise CommandError( "A (standard) Django group with id \"%s\" already exists. Remove this group and re-run this command." % settings.REFINERY_PUBLIC_GROUP_ID )
        elif ExtendedGroup.objects.filter( name__exact=settings.REFINERY_PUBLIC_GROUP_NAME ).count() > 0:
            print("A Refinery group named '%s' already exists." % settings.REFINERY_PUBLIC_GROUP_NAME)
#            raise CommandError( "A Refinery group named \"%s\" already exists. Remove this group and re-run this command." % settings.REFINERY_PUBLIC_GROUP_NAME )
        elif ExtendedGroup.objects.filter( name__exact=settings.REFINERY_PUBLIC_GROUP_ID ).count() > 0:
            print("A Refinery group with id '%s' already exists." % settings.REFINERY_PUBLIC_GROUP_ID)
#            raise CommandError( "A Refinery group with id \"%s\" already exists. Remove this group and re-run this command." % settings.REFINERY_PUBLIC_GROUP_ID )
        else:
            ExtendedGroup.objects.create( id=settings.REFINERY_PUBLIC_GROUP_ID, name=settings.REFINERY_PUBLIC_GROUP_NAME )
            print( "Successfully created group '%s'." % settings.REFINERY_PUBLIC_GROUP_NAME ) 
