'''
Created on Apr 5, 2012

@author: nils
'''
import logging
import urlparse

from bioblend import galaxy
import celery
from celery.result import TaskSetResult
from celery.task import Task, task
from celery.task.sets import TaskSet
import requests

from core.models import Analysis, AnalysisResult, Workflow
from core.utils import get_full_url
from data_set_manager.models import Node
from file_store.models import FileStoreItem
from file_store.tasks import create, import_file

from .models import AnalysisStatus

logger = logging.getLogger(__name__)


class AnalysisHandlerTask(Task):
    abstract = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Set analysis status to failure in case of errors not handled in the
        monitoring task
        """
        error_msg = "Monitoring task for analysis with UUID '{}' failed due " \
                    "to unexpected error: '{}: {}'".format(
                         args[1], einfo.type, einfo.exception)

        logger.error(error_msg)
        try:
            analysis = Analysis.objects.get(uuid=args[1])
        except (Analysis.DoesNotExist, Analysis.MultipleObjectsReturned) as e:
            logger.error("Can not retrieve analysis with UUID '%s': '%s'",
                         args[1], e)
            return
        logger.error("Setting status of analysis '%s' to failure", analysis)
        analysis.set_status(Analysis.FAILURE_STATUS, error_msg)


class AnalysisRunner(object):
    """
    Class that manages the file importing/exporting, execution, and Galaxy
    operations for an Analysis
    """
    def __init__(self, analysis_uuid):
        self.RETRY_INTERVAL = 5  # seconds

        self.analysis = None
        self.analysis_status = None
        self.analysis_uuid = analysis_uuid
        self.galaxy_export_taskset = None
        self.galaxy_import_taskset = None
        self.refinery_import_taskset = None
        self.tool = None

        try:
            self.analysis = Analysis.objects.get(uuid=self.analysis_uuid)
        except (Analysis.DoesNotExist,
                Analysis.MultipleObjectsReturned) as e:
            logger.error("Can not retrieve analysis with UUID '%s': '%s'",
                         self.analysis_uuid, e)
            self.run_analysis.update_state(state=celery.states.FAILURE)
            return
        else:
            self.tool = self.analysis.get_tool()

        # Execute the `run_analysis` task
        self.run_analysis.delay(self, self.analysis.uuid)

    def _attach_workflow_outputs(self):
        """
        Attach the resulting files from the Galaxy workflow execution to
        our Analysis
        """
        if self.analysis.workflow.type == Workflow.ANALYSIS_TYPE:
            self.analysis.attach_outputs_dataset()
        elif self.analysis.workflow.type == Workflow.DOWNLOAD_TYPE:
            self.analysis.attach_outputs_downloads()
        else:
            logger.warning("Unknown workflow type '%s' in analysis '%s'",
                           self.analysis.workflow.type, self.analysis.name)

        self.analysis.set_status(Analysis.SUCCESS_STATUS)
        self.analysis.rename_results()
        self.analysis.send_email()
        logger.info("Analysis '%s' finished successfully", self.analysis)
        self.analysis.galaxy_cleanup()
        self.refinery_import_taskset.delete()
        self.galaxy_import_taskset.delete()
        self.galaxy_export_taskset.delete()

        # Update file count and file size of the corresponding data set
        self.analysis.data_set.file_count = (
            self.analysis.data_set.get_file_count()
        )
        # FIXME: line below is causing analyses to be marked as failed
        # analysis.data_set.file_size = analysis.data_set.get_file_size()
        self.analysis.data_set.save()

    def _check_analysis_status(self):
        """
        Fetch the AnalysisStatus instance associated with the Analysis.
        Fail the task appropriately if we cannot fetch it.
        """
        try:
            self.analysis_status = AnalysisStatus.objects.get(
                analysis=self.analysis)
        except (AnalysisStatus.DoesNotExist,
                AnalysisStatus.MultipleObjectsReturned) as exc:
            logger.error("Can not retrieve status for analysis '%s': '%s'",
                         self.analysis, exc)
            self.run_analysis.update_state(state=celery.states.FAILURE)
            return

    def _galaxy_file_export(self):
        """
        Check on the status of the files being exported from Galaxy.
        Fail the task appropriately if we cannot retrieve the status.
        """
        if not self.analysis_status.galaxy_export_task_group_id:
            galaxy_export_tasks = get_galaxy_download_tasks(self.analysis)
            logger.info(
                "Starting downloading of results from Galaxy for analysis "
                "'%s'", self.analysis)
            self.galaxy_export_taskset = TaskSet(
                tasks=galaxy_export_tasks
            ).apply_async()
            self.galaxy_export_taskset.save()
            self.analysis_status.galaxy_export_task_group_id = (
                self.galaxy_export_taskset.taskset_id
            )
            self.analysis_status.save()
            self.run_analysis.retry(countdown=self.RETRY_INTERVAL)

        # check if analysis results have finished downloading from Galaxy
        self.galaxy_export_taskset = TaskSetResult.restore(
            self.analysis_status.galaxy_export_task_group_id)
        if not self.galaxy_export_taskset.ready():
            logger.debug("Results download pending for analysis '%s'",
                         self.analysis)
            self.run_analysis.retry(countdown=self.RETRY_INTERVAL)
        # all tasks must have succeeded or failed
        elif not self.galaxy_export_taskset.successful():
            error_msg = ("Analysis '{}' failed while downloading results "
                         "from Galaxy".format(self.analysis))
            logger.error(error_msg)
            self.analysis.set_status(Analysis.FAILURE_STATUS, error_msg)
            self.analysis.send_email()
            self.refinery_import_taskset.delete()
            self.galaxy_import_taskset.delete()
            self.galaxy_export_taskset.delete()
            self.analysis.galaxy_cleanup()
            return

    def _galaxy_file_import(self):
        """
        Check on the status of the files being imported into Galaxy.
        Fail the task appropriately if we cannot retrieve the status.
        """
        try:
            percent_complete = self.analysis.galaxy_progress()
        except RuntimeError:
            self.analysis_status.set_galaxy_history_state(AnalysisStatus.ERROR)
            self.analysis.send_email()
            self.refinery_import_taskset.delete()
            self.galaxy_import_taskset.delete()
            self.analysis.galaxy_cleanup()
            return
        except galaxy.client.ConnectionError:
            self.analysis_status.set_galaxy_history_state(
                AnalysisStatus.UNKNOWN
            )
            self.run_analysis.retry(countdown=self.RETRY_INTERVAL)
        else:
            # workaround to avoid moving the progress bar backward
            if self.analysis_status.galaxy_history_progress < percent_complete:
                self.analysis_status.galaxy_history_progress = percent_complete
                self.analysis_status.save()
            if percent_complete < 100:
                self.analysis_status.set_galaxy_history_state(
                    AnalysisStatus.PROGRESS)
                self.run_analysis.retry(countdown=self.RETRY_INTERVAL)
            else:
                self.analysis_status.set_galaxy_history_state(
                    AnalysisStatus.OK
                )

    def _refinery_file_import(self):
        """
        Check on the status of the files being imported into Refinery.
        Fail the task appropriately if we cannot retrieve the status.
        """
        if not self.analysis_status.refinery_import_task_group_id:
            logger.info("Starting analysis '%s'", self.analysis)
            self.analysis.set_status(Analysis.RUNNING_STATUS)
            logger.info("Starting input file import tasks for analysis '%s'",
                        self.analysis)
            refinery_import_tasks = []

            if self.tool:
                input_file_uuid_list = self.tool.get_input_file_uuid_list()
            else:
                input_file_uuid_list = self.analysis.get_input_file_uuid_list()
            for input_file_uuid in input_file_uuid_list:
                refinery_import_task = import_file.subtask((input_file_uuid,))
                refinery_import_tasks.append(refinery_import_task)
            self.refinery_import_taskset = TaskSet(
                tasks=refinery_import_tasks).apply_async()
            self.refinery_import_taskset.save()
            self.analysis_status.refinery_import_task_group_id = \
                self.refinery_import_taskset.taskset_id
            self.analysis_status.save()
            self.run_analysis.retry(countdown=self.RETRY_INTERVAL)

        # check if all files were successfully imported into Refinery
        self.refinery_import_taskset = TaskSetResult.restore(
            self.analysis_status.refinery_import_task_group_id
        )
        if not self.refinery_import_taskset.ready():
            logger.debug("Input file import pending for analysis '%s'",
                         self.analysis)
            self.run_analysis.retry(countdown=self.RETRY_INTERVAL)

        elif not self.refinery_import_taskset.successful():
            error_msg = "Analysis '{}' failed during file import".format(
                self.analysis)
            logger.error(error_msg)
            self.analysis.set_status(Analysis.FAILURE_STATUS, error_msg)
            self.analysis.send_email()
            self.refinery_import_taskset.delete()
            return

    @task(base=AnalysisHandlerTask, max_retries=None)
    def run_analysis(self, analysis_uuid):
        """
        Manage file importing/exporting, execution, and Galaxy operations for
        an Analysis
        """
        logger.info("Executing Analysis with UUID: ""%s", analysis_uuid)

        # if cancelled by user
        if self.analysis.failed():
            return

        self._check_analysis_status()
        self._refinery_file_import()
        self._run_galaxy_workflow()
        self._galaxy_file_import()
        self._galaxy_file_export()
        self._attach_workflow_outputs()

    def _run_galaxy_workflow(self):
        """
        Import files into Galaxy and execute Galaxy Workflow
        """
        if not self.analysis_status.galaxy_import_task_group_id:
            logger.debug("Starting analysis execution in Galaxy")
            try:
                self.analysis.prepare_galaxy()
            except (requests.exceptions.ConnectionError,
                    galaxy.client.ConnectionError):
                error_msg = "Analysis '{}' failed during preparation in " \
                            "Galaxy".format(self.analysis)
                logger.error(error_msg)
                self.analysis.set_status(Analysis.FAILURE_STATUS, error_msg)
                self.analysis.send_email()
                self.refinery_import_taskset.delete()
                return
            galaxy_import_tasks = [
                start_galaxy_analysis.subtask((self.analysis.uuid,)),
            ]
            self.galaxy_import_taskset = TaskSet(
                tasks=galaxy_import_tasks
            ).apply_async()
            self.galaxy_import_taskset.save()
            self.analysis_status.galaxy_import_task_group_id = \
                self.galaxy_import_taskset.taskset_id
            self.analysis_status.set_galaxy_history_state(
                AnalysisStatus.PROGRESS
            )
            self.run_analysis.retry(countdown=self.RETRY_INTERVAL)

        # check if data files were successfully imported into Galaxy
        self.galaxy_import_taskset = TaskSetResult.restore(
            self.analysis_status.galaxy_import_task_group_id
        )
        if not self.galaxy_import_taskset.ready():
            logger.debug("Analysis '%s' pending in Galaxy", self.analysis)
            self.run_analysis.retry(countdown=self.RETRY_INTERVAL)
        elif not self.galaxy_import_taskset.successful():
            error_msg = "Analysis '{}' failed in Galaxy".format(self.analysis)
            logger.error(error_msg)
            self.analysis.set_status(Analysis.FAILURE_STATUS, error_msg)
            self.analysis_status.set_galaxy_history_state(AnalysisStatus.ERROR)
            self.analysis.send_email()
            self.refinery_import_taskset.delete()
            self.galaxy_import_taskset.delete()
            self.analysis.galaxy_cleanup()
            return


def import_analysis_in_galaxy(ret_list, library_id, connection):
    """Take workflow configuration and import files into galaxy
    assign galaxy_ids to ret_list

    """
    logger.debug("Uploading analysis input files to Galaxy")
    for fileset in ret_list:
        for k, v in fileset.iteritems():

            cur_item = fileset[k]

            # getting the current file_uuid from the given node_uuid
            try:
                curr_file_uuid = Node.objects.get(
                    uuid=cur_item['node_uuid']).file_uuid
            except Node.DoesNotExist:
                logger.error("Couldn't fetch Node")
                return None

            try:
                current_filestore_item = FileStoreItem.objects.get_item(
                    uuid=curr_file_uuid)
            except FileStoreItem.DoesNotExist:
                logger.error("Couldn't fetch FileStoreItem")
                return None

            # Create url based on filestore_item's location (local file or
            # external file)
            file_url = get_full_url(current_filestore_item.get_datafile_url())

            try:
                file_id = connection.libraries.upload_file_from_url(
                        library_id, file_url)[0]['id']
            except (galaxy.client.ConnectionError, IOError) as exc:
                logger.error("Failed adding file '%s' to Galaxy "
                             "library '%s': %s",
                             curr_file_uuid, library_id, exc)
                raise

            cur_item["id"] = file_id

    return ret_list


@task()
def start_galaxy_analysis(analysis_uuid):
    """Import data files into Galaxy and run workflow"""
    error_msg = "Analysis execution in Galaxy failed: "
    try:
        analysis = Analysis.objects.get(uuid=analysis_uuid)
    except (Analysis.DoesNotExist, Analysis.MultipleObjectsReturned) as exc:
        error_msg += "can not retrieve analysis with UUID '%s': '%s'"
        logger.error(error_msg, analysis_uuid, exc)
        # fail the task?
        return

    connection = analysis.galaxy_connection()

    # generates same ret_list purely based on analysis object
    ret_list = analysis.get_config()
    # NEED TO IMPORT TO GALAXY TO GET GALAXY_IDS
    try:
        ret_list = import_analysis_in_galaxy(
            ret_list, analysis.library_id, connection)
    except (RuntimeError, galaxy.client.ConnectionError) as exc:
        error_msg += "error importing analysis '%s' into Galaxy: %s"
        logger.error(error_msg, analysis.name, exc.message)
        analysis.set_status(Analysis.FAILURE_STATUS, error_msg)
        analysis.galaxy_cleanup()
        start_galaxy_analysis.update_state(state=celery.states.FAILURE)
        return

    try:
        workflow = connection.workflows.show_workflow(
            analysis.workflow_galaxy_id)
    except galaxy.client.ConnectionError:
        error_msg += "error getting information for workflow '%s' from Galaxy"
        logger.error(error_msg, analysis.workflow_galaxy_id)
        analysis.set_status(Analysis.FAILURE_STATUS, error_msg)
        analysis.galaxy_cleanup()
        start_galaxy_analysis.update_state(state=celery.states.FAILURE)
        return

    ds_map = {}
    annot_inputs = {}
    annot_counts = {}
    # iterate over distinct workflow inputs
    for data_input in analysis.workflow.data_inputs.all():
        input_type = data_input.name
        annot_inputs[input_type] = []
        annot_counts[input_type] = 0
    # configure input files
    for in_key, input_details in workflow['inputs'].iteritems():
        inType = input_details['label']
        if inType in annot_inputs:
            temp_count = annot_counts[inType]
            winput_id = ret_list[temp_count][inType]['id']
            annot_counts[inType] = temp_count + 1
        ds_map[in_key] = {"id": winput_id, "src": "ld"}

    # Running workflow
    tool = analysis.get_tool()
    if tool:
        try:
            workflow_invocation = connection.workflows.invoke_workflow(
                workflow_id=tool.tool_definition.workflow.internal_id,
                inputs=ds_map,
                history_name=tool.get_unique_history_name()
            )
        except galaxy.client.ConnectionError as exc:
            error_msg += "error running Galaxy workflow for analysis '%s': %s"
            logger.error(error_msg, analysis.name, exc.message)
            start_galaxy_analysis.update_state(state=celery.states.FAILURE)
        else:
            workflow_invocation_data = connection.workflows.show_invocation(
                workflow_id=tool.tool_definition.workflow.internal_id,
                invocation_id=workflow_invocation["id"]
            )
            tool_launch_config = tool.get_tool_launch_config()
            tool_launch_config["workflow_invocation_data"] = (
                workflow_invocation_data
            )
            tool.set_tool_launch_config(tool_launch_config)
    else:
        try:
            connection.workflows.run_workflow(
                workflow_id=analysis.workflow_galaxy_id,
                dataset_map=ds_map,
                history_id=analysis.history_id
            )
        except galaxy.client.ConnectionError as exc:
            error_msg += "error running Galaxy workflow for analysis '%s': %s"
            logger.error(error_msg, analysis.name, exc.message)
            start_galaxy_analysis.update_state(state=celery.states.FAILURE)


def get_galaxy_download_tasks(analysis):
    """Get file import tasks for Galaxy analysis results"""
    logger.debug("Preparing to download analysis results from Galaxy")
    task_list = []

    # retrieving list of files to download for workflow
    dl_files = analysis.workflow_dl_files
    # creating dictionary based on files to download predetermined by workflow
    # w/ keep operators
    dl_dict = {}
    for dl in dl_files.all():
        temp_dict = {}
        temp_dict['filename'] = dl.filename
        temp_dict['pair_id'] = dl.pair_id
        dl_dict[str(dl.step_id)] = temp_dict
    galaxy_instance = analysis.workflow.workflow_engine.instance

    tool = analysis.get_tool()
    if tool:
        galaxy_instance = analysis.workflow.workflow_engine.instance
        try:
            download_list = galaxy_instance.get_history_file_list(
                tool.get_tool_launch_config(
                )["workflow_invocation_data"]["history_id"]
            )
        except galaxy.client.ConnectionError as exc:
            error_msg = ("Error downloading Galaxy history files for "
                         "analysis '%s': %s")
            logger.error(error_msg, analysis.name, exc.message)
            analysis.set_status(Analysis.FAILURE_STATUS, error_msg)
            analysis.galaxy_cleanup()
            return task_list
    else:
        try:
            download_list = galaxy_instance.get_history_file_list(
                analysis.history_id)
        except galaxy.client.ConnectionError as exc:
            error_msg = (
                "Error downloading Galaxy history files for analysis '%s': %s"
            )
            logger.error(error_msg, analysis.name, exc.message)
            analysis.set_status(Analysis.FAILURE_STATUS, error_msg)
            analysis.galaxy_cleanup()
            return task_list
    # Iterating through files in current galaxy history
    for results in download_list:
        # download file if result state is "ok"
        if results['state'] == 'ok':
            file_type = results["type"]
            curr_file_id = results['name']
            if curr_file_id in dl_dict:
                curr_dl_dict = dl_dict[curr_file_id]
                result_name = curr_dl_dict['filename'] + '.' + file_type
                # size of file defined by galaxy
                file_size = results['file_size']
                # Determining tag if galaxy results should be download through
                # http or copying files directly to retrieve HTML files as zip
                # archives via dataset URL
                if galaxy_instance.local_download and file_type != 'html':
                    download_url = results['file_name']
                else:
                    download_url = urlparse.urljoin(
                            galaxy_instance.base_url, '/'.join(
                                    ['datasets', str(results['dataset_id']),
                                     'display?to_ext=txt']))
                # workaround to set the correct file type for zip archives of
                # FastQC HTML reports produced by Galaxy dynamically
                if file_type == 'html':
                    file_type = 'zip'
                # TODO: when changing permanent=True, fix update of % download
                # of file
                filestore_uuid = create(
                    source=download_url, filetype=file_type)
                # adding history files to django model
                temp_file = AnalysisResult(
                    analysis_uuid=analysis.uuid,
                    file_store_uuid=filestore_uuid,
                    file_name=result_name, file_type=file_type)
                temp_file.save()
                analysis.results.add(temp_file)
                analysis.save()
                # downloading analysis results into file_store
                # only download files if size is greater than 1
                if file_size > 0:
                    task_id = import_file.subtask(
                            (filestore_uuid, False, file_size))
                    task_list.append(task_id)

    return task_list
