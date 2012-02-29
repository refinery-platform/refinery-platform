from django.db import models
from django_extensions.db.fields import UUIDField


class BaseResource ( models.Model ):
    '''
    Abstract base class for core resources such as users, projects, analyses, data sets and so on.
    
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


class User ( BaseResource ):
    first_name = models.CharField( max_length=50 ) 
    last_name = models.CharField( max_length=50 )    
    # email address length: http://www.rfc-editor.org/errata_search.php?rfc=3696&eid=1690    
    email = models.EmailField( max_length=254 )
    affiliation = models.CharField( max_length=100, blank=True )
            
    def __unicode__(self):
        return self.first_name + " " + self.last_name + " (" + self.email + ")"

        
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
        return self.user.name + ": " + self.get_userRole_display() + " of " + self.resource.name

    class Meta:
        abstract = True
    
        
class DataSet ( AbstractUserResource ):
    summary = models.CharField( max_length=1000, blank=True )

    users = models.ManyToManyField( User, through="DataSetUserRelationship" )    

    def __unicode__(self):
        return self.name + " - " + self.summary

class DataSetUserRelationship( AbstractUserRelationship ):
    resource = models.ForeignKey( DataSet )
    
        
class Workflow ( AbstractUserResource ):
    summary = models.CharField( max_length=1000, blank=True )

    users = models.ManyToManyField( User, through="WorkflowUserRelationship" )    

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
            
            
class Analysis ( BaseResource ):
    creator = models.ForeignKey( User )
    summary = models.CharField( max_length=1000, blank=True )
    version = models.IntegerField()

    project = models.ForeignKey( Project )
    data_set = models.ForeignKey( DataSet, blank=True )
    workflow = models.ForeignKey( Workflow, blank=True )

    def __unicode__(self):
        return self.name + " - " + self.summary