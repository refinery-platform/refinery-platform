from django.db import models
from django_extensions.db.fields import UUIDField

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
    
    preprocessing_taskset_id = models.IntegerField( blank=True )
    execution_taskset_id = models.IntegerField( blank=True )
    postprocessing_taskset_id = models.IntegerField( blank=True )
    
    




