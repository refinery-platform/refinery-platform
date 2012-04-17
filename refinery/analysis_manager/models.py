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
    
    preprocessing_taskset_id = UUIDField( blank=True, null=True )
    execution_taskset_id = UUIDField( blank=True, null=True )
    postprocessing_taskset_id = UUIDField( blank=True, null=True )
    execution_monitor_task_id = UUIDField( blank=True, null=True )
    
    def current(self):        
        preprocessing_result = False
        execution_result = False
        postprocessing_result = False
        
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
        
        #return { "preprocessing": preprocessing_result, "preprocessing_tasks": preprocessing_subtasks, "execution": execution_result, "postprocessing": postprocessing_result } 
        return { "preprocessing": preprocessing_result, "execution": execution_result, "postprocessing": postprocessing_result } 




