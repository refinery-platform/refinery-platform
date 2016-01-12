import celery
from celery.result import TaskSetResult
import logging

from django.db import models
from django.db.models.fields import CharField, PositiveSmallIntegerField
from django_extensions.db.fields import UUIDField

from file_store.models import FileStoreItem


logger = logging.getLogger(__name__)


class AnalysisStatus(models.Model):
    OK = 'ok'
    ERROR = 'error'
    RUNNING = 'running'
    UNKNOWN = ''
    GALAXY_HISTORY_STATES = (
        (OK, 'OK'),
        (ERROR, 'Error'),
        (RUNNING, 'Running'),
        (UNKNOWN, 'Unknown')
    )
    analysis = models.ForeignKey("core.Analysis")  # prevents circular import
    refinery_import_task_group_id = UUIDField(blank=True, null=True,
                                              auto=False)
    galaxy_import_task_group_id = UUIDField(blank=True, null=True, auto=False)
    galaxy_export_task_group_id = UUIDField(blank=True, null=True, auto=False)
    #: state of Galaxy history
    galaxy_history_state = CharField(max_length=7, blank=True,
                                     choices=GALAXY_HISTORY_STATES)
    #: percentage of successfully processed datasets in Galaxy history
    galaxy_history_progress = PositiveSmallIntegerField(blank=True, null=True)

    def __unicode__(self):
        return self.analysis.name

    def set_galaxy_history_state(self, state):
        if state in dict(self.GALAXY_HISTORY_STATES).keys():
            self.galaxy_history_state = state
            self.save()
        else:
            raise ValueError("Invalid Galaxy history state given")

    def refinery_import_state(self):
        if self.refinery_import_task_group_id:
            return get_task_group_state(self.refinery_import_task_group_id)
        else:
            return None

    def galaxy_import_state(self):
        if self.galaxy_import_task_group_id:
            state = get_task_group_state(self.galaxy_import_task_group_id)
            # can not get analysis state in Galaxy from a task state
            state.append({
                'state': self.galaxy_history_state,
                'percent_done': self.galaxy_history_progress
            })
            return state
        else:
            return None

    # def galaxy_analysis_state(self):
    #     return {
    #         'state': self.galaxy_history_state,
    #         'percent_done': self.galaxy_history_progress
    #     }

    def galaxy_export_state(self):
        if self.galaxy_export_task_group_id:
            return get_task_group_state(self.galaxy_export_task_group_id)
        else:
            return None


def get_task_group_state(task_group_id):
    """return a list containing states of all tasks given a task set ID"""
    task_group_state = []
    percent_done = 0

    taskset = TaskSetResult.restore(task_group_id)
    if not taskset:
        logger.error("TaskSet with UUID '%s' doesn't exist", task_group_id)
        return task_group_state

    for task in taskset.results:
        # AsyncResult.info does not contain task state after task has finished
        if task.state == celery.states.SUCCESS:
            percent_done = 100
        elif task.info:
            percent_done = task.info.get('percent_done')
        task_group_state.append({
            'state': task.state,
            'percent_done': percent_done,
        })
        logger.debug("'%s' - '%s' - '%s' - '%s'",
                     task.task_name, task.state, task.info, percent_done)
    return task_group_state
