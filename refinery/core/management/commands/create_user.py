'''
Created on Oct 3, 2012

@author: nils
'''

from core.models import ExtendedGroup
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
import logging


# get module logger
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Creates a Refinery user account."

    """
    Name: handle
    Description:
    main program; run the command
    """   
    def handle(self, username, password, email, first_name, last_name, affiliation, **options):
        '''
        This function creates a user account for Refinery.
        '''
        # delete if exists
        user_object = User.objects.filter( username__exact=username )
        
        if len( user_object ) > 0:
            print "User " + username + " already exists. Please delete the account and try again."
            logger.error( "User " + username + " already exists. Please delete the account and try again." )
            return
        
        user_object = User.objects.create_user( username, email=email, password=password )        
        user_object.first_name =first_name
        user_object.last_name = last_name        
        user_object.get_profile().affiliation = affiliation
        user_object.save()
        
        user_object.groups.add( ExtendedGroup.objects.public_group() )
        
        print "User " + username + " created."
        logger.info( "User " + username + " created." )
         
