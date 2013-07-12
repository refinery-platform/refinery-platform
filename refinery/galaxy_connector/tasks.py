from celery.task import task
from celery.task.sets import subtask
from galaxy_connector.galaxy_workflow import createBaseWorkflow, createSteps, createStepsAnnot
from datetime import datetime
from data_set_manager.tasks import download_http_file
from core.models import *
import os
from celery import Celery
from celery import states
import time
from django.conf import settings
from django.contrib.sites.models import Site
from analysis_manager.tasks import run_analysis


@task()
def monitor_workflow( instance, connection, interval=5.0 ):
    '''
    Run and monitor a test workflow in Galaxy. 
    '''

    # create library and history
    library_id = connection.create_library(Site.objects.get_current().name + " Test Library - " + str( datetime.now() ) )    
    history_id = connection.create_history(Site.objects.get_current().name + " Test History - " + str( datetime.now() ) )
    
    workflow_task = subtask( run_workflow ).delay( instance, connection, library_id, history_id )
    
    while True:
        progress = connection.get_progress( history_id )
        monitor_workflow.update_state( state="PROGRESS", meta=progress )
        print  "Sleeping ..."
        time.sleep( interval );
        print  "Awake ..."
        print  "Workflow Task State: " + workflow_task.state + "\n"
        print  "Workflow State: " + progress["workflow_state"] + "\n"
                
        if workflow_task.state == "SUCCESS":
            print "Workflow task finished successfully."
            
            if progress["workflow_state"] == "ok":
                print "Workflow finished successfully. Stopping monitor ..."
                break

            if progress["workflow_state"] == "error":
                print "Workflow failed. Stopping monitor ..."
                break
             
            if progress["workflow_state"] == "queued":
                print "Workflow running."

            if progress["workflow_state"] == "new":
                print "Workflow being prepared."

        
        if workflow_task.state == "FAILURE":
            print "Workflow task failed . Stopping monitor ..."
            break
    
    # return the final state information  
    return progress
    
