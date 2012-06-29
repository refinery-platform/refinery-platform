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
        workflow_engines = WorkflowEngine.objects.all()
        
        workflows = 0
        
        print str( workflow_engines.count() ) + " workflow engines found"
        for engine in workflow_engines:
            print "Importing from workflow engine \"" + engine.name + "\" ..."
            get_workflows( engine );
            new_workflow_count = engine.workflow_set.all().count()
            print str( ( new_workflow_count ) ) + " workflows imported from workflow \"" + engine.name + "\" ..." 
            workflows += new_workflow_count
        
        print str( workflows ) + " workflows imported from " + str( workflow_engines.count() ) + " workflow engines"