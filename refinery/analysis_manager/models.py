import logging
import os

from django.db import models
from django.db.models.fields import CharField, PositiveSmallIntegerField

import celery
from celery.result import TaskSetResult

logger = logging.getLogger(__name__)


class AnalysisStatus(models.Model):
    OK = 'SUCCESS'
    ERROR = 'FAILURE'
    PROGRESS = 'PROGRESS'
    UNKNOWN = 'PENDING'
    GALAXY_HISTORY_STATES = (
        (OK, 'OK'),
        (ERROR, 'Error'),
        (PROGRESS, 'Running'),
        (UNKNOWN, 'Unknown')
    )
    analysis = models.ForeignKey("core.Analysis")  # prevents circular import
    refinery_import_task_group_id = models.UUIDField(null=True, editable=False)
    galaxy_import_task_group_id = models.UUIDField(null=True, editable=False)
    galaxy_export_task_group_id = models.UUIDField(null=True, editable=False)
    galaxy_workflow_task_group_id = models.UUIDField(null=True, editable=False)
    #: state of Galaxy file imports
    galaxy_import_state = CharField(max_length=10, blank=True,
                                    choices=GALAXY_HISTORY_STATES)
    #: state of Galaxy history
    galaxy_history_state = CharField(max_length=10, blank=True,
                                     choices=GALAXY_HISTORY_STATES)

    #: percentage of successfully imported datasets in Galaxy history
    galaxy_import_progress = PositiveSmallIntegerField(default=0)

    #: percentage of successfully processed datasets in Galaxy history
    # TODO: refactor `galaxy_history_progress` to take advantage of a
    # default value of 0, and
    galaxy_history_progress = PositiveSmallIntegerField(blank=True, null=True)

    class Meta:
        verbose_name_plural = 'analysis statuses'

    def __unicode__(self):
        return self.analysis.name

    def set_galaxy_history_state(self, state):
        """
        Set the `galaxy_history_state` of an analysis
        :param state: a valid GALAXY_HISTORY_STATE
        """
        if state in dict(self.GALAXY_HISTORY_STATES).keys():
            self.galaxy_history_state = state
            self.save()
        else:
            raise ValueError("Invalid Galaxy history state given")

    def set_galaxy_import_state(self, state):
        """
        Set the `galaxy_import_state` of an analysis
        :param state: a valid GALAXY_HISTORY_STATE
        """
        if state in dict(self.GALAXY_HISTORY_STATES).keys():
            self.galaxy_import_state = state
            self.save()
        else:
            raise ValueError("Invalid Galaxy history state given")

    def refinery_import_state(self):
        if self.analysis.has_all_local_input_files():
            return [{'state': celery.states.SUCCESS, 'percent_done': 100}]
        else:
            return get_task_group_state(self.refinery_import_task_group_id)

    def galaxy_file_import_state(self):
        if self.galaxy_import_state and self.galaxy_import_progress != 0:
            galaxy_file_import_state = [{
                'state': self.galaxy_import_state,
                'percent_done': self.galaxy_import_progress
            }]
        else:
            galaxy_file_import_state = []
        return galaxy_file_import_state

    def galaxy_analysis_state(self):
        if self.galaxy_history_state and self.galaxy_history_progress:
            galaxy_history_state = [{
                'state': self.galaxy_history_state,
                'percent_done': self.galaxy_history_progress
            }]
        else:
            galaxy_history_state = []
        return galaxy_history_state

    def galaxy_export_state(self):
        return get_task_group_state(self.galaxy_export_task_group_id)

    def set_galaxy_import_task_group_id(self, galaxy_import_task_group_id):
        self.galaxy_import_task_group_id = galaxy_import_task_group_id
        self.save()

    def set_galaxy_workflow_task_group_id(self, galaxy_workflow_task_group_id):
        self.galaxy_workflow_task_group_id = galaxy_workflow_task_group_id
        self.save()


def get_task_group_state(task_group_id):
    """return a list containing states of all tasks given a task set ID"""
    task_group_state = []
    percent_done = 0
    from celery._state import current_app, default_app
    logger.debug(
        (str(current_app.backend), str(current_app.conf.CELERY_RESULT_BACKEND),
        str(current_app.backend_cls), str(current_app._get_backend()),
        str(default_app), str(current_app.loader_cls),
        str(os.environ.get('CELERY_LOADER')),
        str(os.environ.get('DJANGO_SETTINGS_MODULE')))
    )
    from celery.app import default_app
    logger.debug(str(default_app))

    taskset = TaskSetResult.restore(task_group_id)
    if not taskset:
        logger.error("TaskSet with UUID '%s' doesn't exist", task_group_id)
        return task_group_state

    for task in taskset.results:
        # AsyncResult.info does not contain task state after task has finished
        if task.state == celery.states.SUCCESS:
            percent_done = 100
        elif task.info:
            try:
                percent_done = task.info.get('percent_done') or 0
            except AttributeError:
                logger.error("Task %s failed: %s", task, task.info)
        task_group_state.append({
            'state': task.state,
            'percent_done': percent_done,
        })
    return task_group_state
