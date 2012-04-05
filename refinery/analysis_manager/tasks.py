'''
Created on Apr 5, 2012

@author: nils
'''

from core.models import Analysis
from celery.task import task
from celery.task.sets import subtask
import time

# task: run analysis (outermost task, calls subtasks that monitor and run preprocessing, execution, postprocessing)
@task()
def run_analysis( analysis, interval=5.0 ):

    # PREPROCESSING
    preprocessing_task = subtask( monitor_analysis_preprocessing ).delay( analysis )
    
    #TODO: create a function to do this
    while True:
        run_analysis.update_state( state="PREPROCESSING" )
        time.sleep( interval );
        print  "Preprocessing Task State: " + preprocessing_task.state + "\n"
                
        if preprocessing_task.state == "SUCCESS":
            print "Preprocessing task finished successfully. Stopping monitor ..."
            break;
        
        if preprocessing_task.state == "FAILURE":
            print "Preprocessing task failed . Stopping monitor ..."
            break


    # EXECUTION
    execution_task = subtask( monitor_analysis_execution).delay( analysis )
    
    while True:
        run_analysis.update_state( state="EXECUTION" )
        time.sleep( interval );
        print  "Execution Task State: " + execution_task.state + "\n"
                
        if execution_task.state == "SUCCESS":
            print "Execution task finished successfully. Stopping monitor ..."
            break;
        
        if execution_task.state == "FAILURE":
            print "Execution task failed . Stopping monitor ..."
            break


    # POSTPROCESSING
    postprocessing_task = subtask( monitor_analysis_postprocessing ).delay( analysis )

    while True:
        run_analysis.update_state( state="POSTPROCESSING" )
        time.sleep( interval );
        print  "Postprocessing Task State: " + postprocessing_task.state + "\n"
                
        if postprocessing_task.state == "SUCCESS":
            print "Postprocessing task finished successfully. Stopping monitor ..."
            break;
        
        if postprocessing_task.state == "FAILURE":
            print "Postprocessing task failed . Stopping monitor ..."
            break
        
    return

# task: monitor preprocessing (calls subtask that does the actual work)
@task()
def monitor_analysis_preprocessing( analysis ):
    return

# task: perform postprocessing (innermost task, does the actual work)
@task()
def run_analysis_preprocessing( analysis ):
    
    # run two task in parallel:
    # 1. obtain files
    # 2. obtain expanded workflow
    
    return

# task: monitor workflow execution (calls subtask that does the actual work)
@task()
def monitor_analysis_execution( analysis ):    
    return

# task: perform execution (innermost task, does the actual work)
@task()
def run_analysis_execution( analysis ):
    return

# task: monitor postprocessing (calls subtask that does the actual work)
@task()
def monitor_analysis_postprocessing( analysis ):
    return

# task: perform postprocessing (innermost task, does the actual work)
@task()
def run_analysis_postprocessing( analysis ):
    return