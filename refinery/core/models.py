'''
Created on Feb 20, 2012

@author: nils
'''

from django.db import models
from django_extensions.db.fields import UUIDField
from django.contrib.auth.models import User
from django.db.models.signals import post_save


class UserProfile ( models.Model ):
    '''
    Extended Django user model: https://docs.djangoproject.com/en/dev/topics/auth/#storing-additional-information-about-users
    '''
    uuid = UUIDField( unique=True, auto=True )

    user = models.OneToOneField( User )
    affiliation = models.CharField( max_length=100, blank=True )

    def __unicode__(self):
        return self.user.first_name + " " + self.user.last_name + " (" + self.affiliation + "): " + self.user.email


# automatic creation of a user profile when a user is created: 
def create_user_profile( sender, instance, created, **kwargs ):
    if created:
        UserProfile.objects.create( user=instance )

post_save.connect( create_user_profile, sender=User )            



class BaseResource ( models.Model ):
    '''
    Abstract base class for core resources such as projects, analyses, data sets and so on.
    
    See https://docs.djangoproject.com/en/1.3/topics/db/models/#abstract-base-classes for details.
    '''
    uuid = UUIDField( unique=True, auto=True )
    name = models.CharField( max_length=250 )
    creation_date = models.DateTimeField( auto_now_add=True )
    modification_date = models.DateTimeField( auto_now=True )

    def __unicode__(self):
        return self.name + " (created: " + str( self.creation_date ) + ", modified: " + str( self.modification_date ) + ")"
        
    class Meta:
        abstract = True

        
class AbstractUserResource ( BaseResource ):
    VISIBILITY_CHOICES = (
        ( 1, u'Private' ),
        ( 2, u'Public' ),
    )    

    visibility = models.IntegerField( choices=VISIBILITY_CHOICES )

    class Meta:
        abstract = True

        
class AbstractUserRelationship ( models.Model ):
    '''
    Abstract base class for relationships between users and user resources (projects, data sets, workflows, etc.).
    
    See https://docs.djangoproject.com/en/1.3/topics/db/models/#abstract-base-classes for details.
    '''

    ROLE_CHOICES = (
        ( 1, u'Administrator' ), # create, read, update, delete,
        ( 2, u'Editor' ), # read, update
        ( 3, u'Viewer' ), # read
    )    
    
    user = models.ForeignKey( User )
    userRole = models.IntegerField( choices=ROLE_CHOICES )     
    creation_date = models.DateTimeField(  auto_now_add=True )
    modification_date = models.DateTimeField(  auto_now=True )
        
    def __unicode__(self):
        return self.user.username + ": " + self.get_userRole_display() + " of " + self.resource.name

    class Meta:
        abstract = True
    
        
class DataSet ( AbstractUserResource ):
    summary = models.CharField( max_length=1000, blank=True )

    users = models.ManyToManyField( User, through="DataSetUserRelationship" )    

    def __unicode__(self):
        return self.name + " - " + self.summary

class DataSetUserRelationship( AbstractUserRelationship ):
    resource = models.ForeignKey( DataSet )


class WorkflowDataInput( models.Model ):
    name = models.CharField( max_length=200 )
    internal_id = models.IntegerField()

    def __unicode__(self):
        return self.name + " (" + str( self.internal_id ) + ")"
             
        
class Workflow ( AbstractUserResource ):
    summary = models.CharField( max_length=1000, blank=True )

    users = models.ManyToManyField( User, through="WorkflowUserRelationship" )
    data_inputs = models.ManyToManyField( WorkflowDataInput )
    internal_id = models.CharField( max_length=50, unique=True )    

    def __unicode__(self):
        return self.name + " - " + self.summary


class WorkflowUserRelationship( AbstractUserRelationship ):
    resource = models.ForeignKey( Workflow )
   
    
class Project ( AbstractUserResource ):
    summary = models.CharField( max_length=1000, blank=True )
    description = models.CharField( max_length=5000, blank=True )
    
    users = models.ManyToManyField( User, through="ProjectUserRelationship" )    
    
    data_sets = models.ManyToManyField( DataSet, blank=True ) 
    workflows = models.ManyToManyField( Workflow, blank=True ) 

    def __unicode__(self):
        return self.name + " - " + self.summary
    
    def save(self, *args, **kwargs):
        ''' overwriting default save behavior to create relationship between current user and project '''
        super( Project, self ).save( *args, **kwargs ) # Call the "real" save() method.
        # if a user is logged in, create a ProjectUserRelationship with the current user as an administrator
        # if this is done through the admin interface, have the admin select a user an make this user the project administrator   

        
class ProjectUserRelationship( AbstractUserRelationship ):
    resource = models.ForeignKey( Project )


class WorkflowDataInputMap( models.Model ):
    #workflow_data_input_internal_id = models.IntegerField()
    workflow_data_input_name = models.CharField( max_length=200 )    
    data_uuid = UUIDField( editable=True )
    pair_id = models.IntegerField(blank=True, null=True)
    
    def __unicode__(self):
        return str( self.workflow_data_input_name ) + " <-> " + self.data_uuid
    
                
class Analysis ( BaseResource ):
    creator = models.ForeignKey( User )
    summary = models.CharField( max_length=1000, blank=True )
    version = models.IntegerField()

    project = models.ForeignKey( Project )
    data_set = models.ForeignKey( DataSet, blank=True )
    workflow = models.ForeignKey( Workflow, blank=True )
    workflow_data_input_maps = models.ManyToManyField( WorkflowDataInputMap )
    workflow_steps_num = models.IntegerField(blank=True, null=True)
    workflow_copy = models.TextField(blank=True, null=True)
    

    def __unicode__(self):
        return self.name + " - " + self.summary