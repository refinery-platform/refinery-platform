from celery.result import AsyncResult, TaskSetResult
from core.models import Analysis
from django.db import models
from django_extensions.db.fields import UUIDField
import math


'''
shift+command+o // cleans up imports 

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
    analysis = models.ForeignKey(Analysis)
    #analysis_uuid = UUIDField( unique=True, auto=False )
    
    preprocessing_taskset_id = UUIDField( blank=True, null=True, auto=False )
    execution_taskset_id = UUIDField( blank=True, null=True, auto=False )
    postprocessing_taskset_id = UUIDField( blank=True, null=True, auto=False )
    cleanup_taskset_id = UUIDField( blank=True, null=True, auto=False )
    execution_monitor_task_id = UUIDField( blank=True, null=True, auto=False )
    
    def preprocessing_status(self):
        return getPayload(self.preprocessing_taskset_id)
    
    def execution_status(self):
        total_steps = Analysis.objects.get(uuid=self.analysis.uuid).workflow_steps_num        
        test = getPayload(self.execution_monitor_task_id)
        #print "test lgneth"
        #print len(test)
            
        test[0]['total_steps'] = total_steps
        if 'ok' in test[0].keys():
            test[0]['percent_done'] =  str(100*float(test[0]['ok'])/float(total_steps)) + '%'
        else:
            test[0]['percent_done'] = '0%'
        return test
    
    def postprocessing_status(self):
        return getPayload(self.postprocessing_taskset_id)
    
    def cleanup_status(self):
        return getPayload(self.cleanup_taskset_id)
  

def getPayload(ts_id):
    
    #print "getPayload \n"
    
    payload = []
    ts = AsyncResult( ts_id )
    if ts:
        #print "*******"
        #print ts
        if ts.result:
            #print ">>>>>>"
            #print ts.result
            #print "&&&&&&&&"
            if type(ts.result) ==type(dict()):
                #print "ts.state is dict"
                #print "ts.state"
                if type(ts.result['message']) ==type(dict()):
                    temp_ret = ts.result['message']
                else:
                    temp_ret = ts.result
                #print "temp_ret"
                #print temp_ret
                temp_ret['state'] = ts.state
                temp_ret['task_id'] = ts.task_id
                payload.append(temp_ret)
            elif (ts.result.__class__.__name__ == 'TaskSetResult'):
                #print "ts.state is TaskSetResult"
                #print "        $$$$$$$$"
                #print ts.result.results
                n_tasks = len(ts.result.results)
                if n_tasks > 0:
                    #print "Greater than 0 tas"
                    #print n_tasks
 
                    for j in range(0,n_tasks):
                        #print "\t \t jjjjjjj:" + str(j)
                        temp_ret = {};
                        if ts.result.results[j].result:
                            #print "error_perm"
                            #print ts.result.results[j]
                            #print ts.result.results[j].state
                            if ts.result.results[j].result.__class__.__name__ == 'FileStoreItem':
                                temp_ret['state'] = ts.result.results[j].state
                                temp_ret['task_id'] = ts.result.results[j].task_id
                                payload.append(temp_ret)
                            
                            else:
                                temp_ret = ts.result.results[j].result
                                temp_ret['state'] = str(ts.result.results[j].state)
                                temp_ret['task_id'] = str(ts.result.results[j].task_id)
                                payload.append(temp_ret)
                            #payload.append(ts.result.results[j].result)
                            #print ts.result.results[j].state
                        else:
                            temp_ret['state'] = ts.result.results[j].state
                            temp_ret['task_id'] = ts.result.results[j].task_id
                            payload.append(temp_ret)
                #else:
                #    print "00000 tasks"
                #    print ts.result
            else:
                #print " ))))))))))) \t \ tDIFFERENT TYPE"
                temp_ret = {'state':ts.state, 'info':str(ts.result), 'task_id':ts.task_id}
                payload.append(temp_ret)
                #print ts.result
        else:
            #print "<<<<<<<<<<<<<<<<<< "
            #temp_ret
            temp_ret = {'state':ts.state, 'task_id':ts.task_id}
            payload.append(temp_ret)
    else:
        #print "!!!!nottstststststst"
        #print ts
        temp_ret = {'state':"### WAITING ###"}
        payload.append(temp_ret)
    
    #print "payload called"
    #print "################################"
    #print payload 
    #print len(payload)
    #print "################################"
            
    return payload

