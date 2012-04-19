from django.db import models
from django_extensions.db.fields import UUIDField
from celery.result import TaskSetResult 

'''
http://permalink.gmane.org/gmane.comp.python.amqp.celery.user/2036

from celery.task import TaskSet
   from celery.result import TaskSetResult

   ts_result = TaskSet(add.subtask((i, i)) for i in
xrange(10)).apply_async()
   ts_result.save()
   taskset_id = ts_result.taskset_id

   # later
   ts_result = TaskSetResult.restore(taskset_id)
'''

class AnalysisStatus( models.Model ):
    analysis_uuid = UUIDField( unique=True, auto=False )
    
    preprocessing_taskset_id = UUIDField( blank=True, null=True, auto=False )
    execution_taskset_id = UUIDField( blank=True, null=True, auto=False )
    postprocessing_taskset_id = UUIDField( blank=True, null=True, auto=False )
    cleanup_taskset_id = UUIDField( blank=True, null=True, auto=False )
    execution_monitor_task_id = UUIDField( blank=True, null=True, auto=False )
    
    def current(self):        
        preprocessing_result = False
        execution_result = False
        postprocessing_result = False
        cleanup_result = False
        execution_monitor_result = False
        
        if not self.preprocessing_taskset_id is None:
            preprocessing_taskset = TaskSetResult.restore( self.preprocessing_taskset_id )
            if preprocessing_taskset is not None:
                preprocessing_result = preprocessing_taskset.waiting()
                preprocessing_subtasks = []
                for res in preprocessing_taskset.results:
                    preprocessing_subtasks.append(res.task_id)
            
        if not self.preprocessing_taskset_id is None:
            execution_taskset = TaskSetResult.restore( self.execution_taskset_id )
            if execution_taskset is not None:
                execution_result = execution_taskset.waiting()
            
        if not self.preprocessing_taskset_id is None:            
            postprocessing_taskset = TaskSetResult.restore( self.postprocessing_taskset_id )
            if postprocessing_taskset is not None:
                postprocessing_result = postprocessing_taskset.waiting()
        
        if not self.cleanup_taskset_id is None:            
            cleanup_taskset = TaskSetResult.restore( self.cleanup_taskset_id )
            if cleanup_taskset is not None:
                cleanup_result = cleanup_taskset.waiting()
        
        if not self.execution_monitor_task_id is None:            
            execution_monitor_taskset = TaskSetResult.restore( self.execution_monitor_task_id )
            if execution_monitor_taskset is not None:
                execution_monitor_result = execution_monitor_taskset.waiting()
           
        #return { "preprocessing": preprocessing_result, "preprocessing_tasks": preprocessing_subtasks, "execution": execution_result, "postprocessing": postprocessing_result } 
        return { "preprocessing": preprocessing_result, "execution": execution_result, "postprocessing": postprocessing_result, "execution_monitor":execution_monitor_result, "cleanup":cleanup_result } 




