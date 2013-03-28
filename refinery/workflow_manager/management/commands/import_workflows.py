'''
Created on Jun 29, 2012

@author: nils
'''
from core.models import ExtendedGroup, Project, DataSet, WorkflowEngine
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from galaxy_connector.models import Instance
from workflow_manager.tasks import get_workflows



class Command(BaseCommand):
    help = "Imports workflows from all registered workflow engines and makes them public."

    """
    Name: handle
    Description:
    main program; run the command
    """   
    def handle(self, **options):
        
        """
        workflow_engine_objects = []
        
        WorkflowEngine.objects.all().delete()
        
        for instance in Instance.objects.all():
            workflow_engine_object = WorkflowEngine.objects.create( instance=instance, name=instance.description, summary=instance.base_url + " " + instance.api_key )
            # TODO: introduce group managers and assign ownership to them        
            workflow_engine_object.set_manager_group( ExtendedGroup.objects.public_group().manager_group )
            #workflow_engine_object.share( ExtendedGroup.objects.public_group() )
                    
            workflow_engine_objects.append( workflow_engine_object )
        
        for workflow_engine in workflow_engine_objects:
            print(str(workflow_engine))
       """
                    
        workflow_engines = WorkflowEngine.objects.all()
        
        workflows = 0
        
        print str( workflow_engines.count() ) + " workflow engines found"
        
        for engine in workflow_engines:
            print "Importing from workflow engine \"" + engine.name + "\" ..."
            old_workflow_count = engine.workflow_set.all().count()
            get_workflows( engine );
            new_workflow_count = engine.workflow_set.all().count()
            print str( ( new_workflow_count-old_workflow_count ) ) + " workflows imported from workflow \"" + engine.name + "\" ..." 
            workflows += (new_workflow_count-old_workflow_count)
        
        print str( workflows ) + " workflows imported from " + str( workflow_engines.count() ) + " workflow engines"
        