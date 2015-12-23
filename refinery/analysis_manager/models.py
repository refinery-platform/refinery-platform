import celery
from celery.result import AsyncResult, TaskSetResult
import logging

from django.db import models
from django.db.models.fields import PositiveSmallIntegerField
from django_extensions.db.fields import UUIDField

from file_store.models import FileStoreItem


logger = logging.getLogger(__name__)


class AnalysisStatus(models.Model):
    analysis = models.ForeignKey("core.Analysis")  # prevents circular import
    preprocessing_taskset_id = UUIDField(blank=True, null=True, auto=False)
    execution_taskset_id = UUIDField(blank=True, null=True, auto=False)
    postprocessing_taskset_id = UUIDField(blank=True, null=True, auto=False)
    cleanup_taskset_id = UUIDField(blank=True, null=True, auto=False)
    execution_monitor_task_id = UUIDField(blank=True, null=True, auto=False)

    def __unicode__(self):
        return self.analysis.name

    def preprocessing_status(self):
        if self.preprocessing_taskset_id:
            return get_taskset_state(self.preprocessing_taskset_id)
        else:
            return None

    def execution_status(self):
        if self.execution_taskset_id:
            return get_taskset_state(self.execution_taskset_id)
        else:
            return None

    def postprocessing_status(self):
        if self.postprocessing_taskset_id:
            return get_taskset_state(self.postprocessing_taskset_id)
        else:
            return None

    def cleanup_status(self):
        if self.cleanup_taskset_id:
            return get_taskset_state(self.cleanup_taskset_id)
        else:
            return None


def get_taskset_state(taskset_id):
    """return a list containing states of all tasks given a task set ID"""
    taskset_state = []
    percent_done = 0
    taskset = TaskSetResult.restore(taskset_id)

    if taskset:
        for task in taskset.results:
            if task.state == celery.states.SUCCESS:
                percent_done = 100
            elif (task.state == celery.states.FAILURE or
                  task.status == celery.states.REVOKED):
                percent_done = 0
            else:
                if task.info:
                    percent_done = task.info.get('percent_done')
            taskset_state.append({
                'state': task.state,
                'percent_done': percent_done,
                'task_id': task.task_id
            })
            logger.debug("'%s' - '%s' - '%s' - '%s'",
                         task.task_name, task.state, task.info, percent_done)
    else:
        logger.error("TaskSet with UUID '%s' doesn't exist", taskset_id)

    return taskset_state
