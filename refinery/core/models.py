'''
Created on Feb 20, 2012

@author: nils
'''

from django.db import models
from django_extensions.db.fields import UUIDField
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.forms import ModelForm
from galaxy_connector.models import Instance

class UserProfile ( models.Model ):
    '''
    Extends Django user model: https://docs.djangoproject.com/en/dev/topics/auth/#storing-additional-information-about-users
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
    summary = models.CharField( max_length=1000, blank=True )
    creation_date = models.DateTimeField( auto_now_add=True )
    modification_date = models.DateTimeField( auto_now=True )    

    def __unicode__(self):
        return self.name + " (" + self.uuid + ")"
        
    class Meta:
        abstract = True


class SharableResource ( BaseResource ):
    '''
    Abstract base class for core resources that can be shared (projects, data sets, workflows, workflow engines, etc.).
    '''

    def __unicode__(self):
        return self.name
        
    class Meta:
        abstract = True

        
class DataSet ( SharableResource ):

    def __unicode__(self):
        return self.name + " - " + self.summary

    class Meta:
        permissions = (
            ('read_dataset', 'Can read data set'),
            ('share_dataset', 'Can share data set'),
        )


class WorkflowDataInput ( models.Model ):
    name = models.CharField( max_length=200 )
    internal_id = models.IntegerField()

    def __unicode__(self):
        return self.name + " (" + str( self.internal_id ) + ")"


class WorkflowEngine ( SharableResource ):
    # TODO: remove Galaxy dependency
    instance = models.ForeignKey( Instance, blank=True )
    
    def __unicode__(self):
        return self.name + " - " + self.summary

    class Meta:
        permissions = (
            ('read_workflowengine', 'Can read workflow engine'),
            ('share_workflowengine', 'Can share workflow engine'),
        )
                 
        
class Workflow ( SharableResource ):

    data_inputs = models.ManyToManyField( WorkflowDataInput, blank=True )
    internal_id = models.CharField( max_length=50, unique=True, blank=True )
    
    # TODO: require this information
    workflow_engine = models.ForeignKey( WorkflowEngine, blank=True, null=True )    

    def __unicode__(self):
        return self.name + " - " + self.summary

    class Meta:
        permissions = (
            ('read_workflow', 'Can read worklow'),
            ('share_workflow', 'Can share workflow'),
        )

    
class Project( SharableResource ):
    description = models.CharField( max_length=5000, blank=True )    

    def __unicode__(self):
        return self.name + " - " + self.summary
    
    #def save(self, *args, **kwargs):
        #''' overwriting default save behavior to create relationship between current user and project '''
        #super( Project, self ).save( *args, **kwargs ) # Call the "real" save() method.
        # if a user is logged in, create a ProjectUserRelationship with the current user as an administrator
        # if this is done through the admin interface, have the admin select a user an make this user the project administrator
        
    class Meta:
        permissions = (
            ('read_project', 'Can read project'),
            ('share_project', 'Can share project'),
        )

class WorkflowDataInputMap( models.Model ):
    #workflow_data_input_internal_id = models.IntegerField()
    workflow_data_input_name = models.CharField( max_length=200 )    
    data_uuid = UUIDField( auto=False )
    
    pair_id = models.IntegerField(blank=True, null=True)
    
    def __unicode__(self):
        return str( self.workflow_data_input_name ) + " <-> " + self.data_uuid
    
                
class Analysis ( BaseResource ):
    project = models.ForeignKey( Project, related_name="analyses" )
    data_set = models.ForeignKey( DataSet, blank=True )
    workflow = models.ForeignKey( Workflow, blank=True )
    workflow_data_input_maps = models.ManyToManyField( WorkflowDataInputMap, blank=True )
    workflow_steps_num = models.IntegerField(blank=True, null=True)
    workflow_copy = models.TextField(blank=True, null=True)
    history_id = models.TextField(blank=True, null=True)
    workflow_galaxy_id = models.TextField(blank=True, null=True)
    library_id = models.TextField(blank=True, null=True)
    

    
    def __unicode__(self):
        return self.name + " - " + self.summary