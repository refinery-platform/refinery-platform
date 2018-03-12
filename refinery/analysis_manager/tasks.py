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

import core
from core.models import Analysis, AnalysisResult, Workflow
from file_store.models import FileStoreItem, FileExtension
from file_store.tasks import import_file
import tool_manager

from .models import AnalysisStatus

logger = logging.getLogger(__name__)

RETRY_INTERVAL = 5  # seconds


class AnalysisHandlerTask(Task):
    abstract = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Set analysis status to failure in case of errors not handled in the
        monitoring task
        """
        error_msg = "Monitoring task for analysis with UUID '{}' failed due " \
                    "to unexpected error: '{}: {}'".format(
                         args[0], einfo.type, einfo.exception)

        logger.error(error_msg)
        try:
            analysis = Analysis.objects.get(uuid=args[0])
        except (Analysis.DoesNotExist, Analysis.MultipleObjectsReturned) as e:
            logger.error("Can not retrieve analysis with UUID '%s': '%s'",
                         args[0], e)
            return
        else:
            analysis.terminate_file_import_tasks()

        logger.error("Setting status of analysis '%s' to failure", analysis)
        analysis.set_status(Analysis.FAILURE_STATUS, error_msg)


def _check_galaxy_history_state(analysis_uuid):
    """
    Monitor the state of our Galaxy history from analysis.galaxy_progress().
    Fail the `run_analysis` task appropriately if we run into trouble.
    Update analysis_status.galaxy_history_progress &
    analysis_status.galaxy_history_state along the way
    """
    analysis = _get_analysis(analysis_uuid)
    analysis_status = _get_analysis_status(analysis_uuid)

    try:
        percent_complete = analysis.galaxy_progress()
    except RuntimeError:
        analysis_status.set_galaxy_history_state(AnalysisStatus.ERROR)
        error_msg = (
            "Analysis '{}' failed during Galaxy Workflow run".format(analysis)
        )
        logger.error(error_msg)
        analysis.set_status(Analysis.FAILURE_STATUS, error_msg)
        analysis.send_email()
        get_taskset_result(
            analysis_status.refinery_import_task_group_id
        ).delete()
        get_taskset_result(
            analysis_status.galaxy_import_task_group_id
        ).delete()
        analysis.galaxy_cleanup()
        return
    except galaxy.client.ConnectionError:
        analysis_status.set_galaxy_history_state(
            AnalysisStatus.UNKNOWN
        )
        run_analysis.retry(countdown=RETRY_INTERVAL)
    else:
        # workaround to avoid moving the progress bar backward
        if analysis_status.galaxy_history_progress < percent_complete:
            analysis_status.galaxy_history_progress = percent_complete
            analysis_status.save()
        if percent_complete < 100:
            analysis_status.set_galaxy_history_state(AnalysisStatus.PROGRESS)
            run_analysis.retry(countdown=RETRY_INTERVAL)
        else:
            analysis_status.set_galaxy_history_state(AnalysisStatus.OK)


def _get_analysis(analysis_uuid):
    """
    Try to fetch the Analysis from the given analysis_uuid. Fail the
    `run_analysis` task if we cannot properly fetch it.
    """
    try:
        return Analysis.objects.get(uuid=analysis_uuid)
    except (Analysis.DoesNotExist,
            Analysis.MultipleObjectsReturned) as e:
        logger.error("Can not retrieve analysis with UUID '%s': '%s'",
                     analysis_uuid, e)
        run_analysis.update_state(state=celery.states.FAILURE)
        return


def _get_analysis_status(analysis_uuid):
    """
    Fetch the AnalysisStatus instance associated with the Analysis.
    Fail the `run_analysis` task appropriately if we cannot fetch it.
    """
    analysis = _get_analysis(analysis_uuid)
    try:
        return AnalysisStatus.objects.get(analysis=analysis)
    except (AnalysisStatus.DoesNotExist,
            AnalysisStatus.MultipleObjectsReturned) as exc:
        logger.error("Can not retrieve status for analysis '%s': '%s'",
                     analysis, exc)
        run_analysis.update_state(state=celery.states.FAILURE)


def get_taskset_result(task_group_id):
    return TaskSetResult.restore(task_group_id)


def _get_workflow_tool(analysis_uuid):
    workflow_tool = tool_manager.utils.get_workflow_tool(analysis_uuid)
    if workflow_tool is None:
        run_analysis.update_state(state=celery.states.FAILURE)
    else:
        return workflow_tool


def _attach_workflow_outputs(analysis_uuid):
    """
    Attach the resulting files from the Galaxy workflow execution to
    our Analysis
    """
    analysis = _get_analysis(analysis_uuid)
    analysis_status = _get_analysis_status(analysis_uuid)

    if analysis.workflow.type == Workflow.ANALYSIS_TYPE:
        analysis.attach_derived_nodes_to_dataset()
    elif analysis.workflow.type == Workflow.DOWNLOAD_TYPE:
        analysis.attach_outputs_downloads()
    else:
        logger.warning("Unknown workflow type '%s' in analysis '%s'",
                       analysis.workflow.type, analysis.name)

    analysis.set_status(Analysis.SUCCESS_STATUS)
    analysis.send_email()
    logger.info("Analysis '%s' finished successfully", analysis)
    analysis.galaxy_cleanup()

    get_taskset_result(analysis_status.refinery_import_task_group_id).delete()
    get_taskset_result(analysis_status.galaxy_import_task_group_id).delete()
    get_taskset_result(analysis_status.galaxy_export_task_group_id).delete()

    # Update file count and file size of the corresponding data set
    analysis.data_set.file_count = analysis.data_set.get_file_count()

    # FIXME: line below is causing analyses to be marked as failed
    # analysis.data_set.file_size = analysis.data_set.get_file_size()
    analysis.data_set.save()


def _galaxy_file_export(analysis_uuid):
    """
    Check on the status of the files being exported from Galaxy.
    Fail the task appropriately if we cannot retrieve the status.
    """
    analysis = _get_analysis(analysis_uuid)
    analysis_status = _get_analysis_status(analysis_uuid)

    if not analysis_status.galaxy_export_task_group_id:
        galaxy_export_tasks = _get_galaxy_download_task_ids(analysis)
        logger.info(
            "Starting downloading of results from Galaxy for analysis "
            "'%s'", analysis)
        galaxy_export_taskset = TaskSet(
            tasks=galaxy_export_tasks
        ).apply_async()
        galaxy_export_taskset.save()
        analysis_status.galaxy_export_task_group_id = (
            galaxy_export_taskset.taskset_id
        )
        analysis_status.save()
        run_analysis.retry(countdown=RETRY_INTERVAL)

    # check if analysis results have finished downloading from Galaxy
    galaxy_export_taskset = get_taskset_result(
        analysis_status.galaxy_export_task_group_id
    )
    if not galaxy_export_taskset.ready():
        logger.debug("Results download pending for analysis '%s'", analysis)
        run_analysis.retry(countdown=RETRY_INTERVAL)
    # all tasks must have succeeded or failed
    elif not galaxy_export_taskset.successful():
        error_msg = ("Analysis '{}' failed while downloading results "
                     "from Galaxy".format(analysis))
        logger.error(error_msg)
        analysis.set_status(Analysis.FAILURE_STATUS, error_msg)
        analysis.send_email()

        get_taskset_result(
            analysis_status.refinery_import_task_group_id
        ).delete()
        get_taskset_result(
            analysis_status.galaxy_import_task_group_id
        ).delete()
        galaxy_export_taskset.delete()
        analysis.galaxy_cleanup()


@task()
def _invoke_galaxy_workflow(analysis_uuid):
    tool = _get_workflow_tool(analysis_uuid)

    tool.create_dataset_collection()

    galaxy_workflow_invocation_data = tool.invoke_workflow()

    tool.analysis.history_id = galaxy_workflow_invocation_data["history_id"]
    tool.analysis.save()

    tool.update_galaxy_data(
        tool.GALAXY_WORKFLOW_INVOCATION_DATA,
        tool.galaxy_connection.workflows.show_invocation(
            tool.get_workflow_internal_id(),
            galaxy_workflow_invocation_data["id"]
        )
    )


def _refinery_file_import(analysis_uuid):
    """
    Check on the status of the files being imported into Refinery.
    Fail the task appropriately if we cannot retrieve the status.
    """
    analysis = _get_analysis(analysis_uuid)
    analysis_status = _get_analysis_status(analysis_uuid)

    if not analysis_status.refinery_import_task_group_id:
        logger.info("Starting analysis '%s'", analysis)
        analysis.set_status(Analysis.RUNNING_STATUS)
        logger.info("Starting input file import tasks for analysis '%s'",
                    analysis)
        refinery_import_tasks = []
        tool = _get_workflow_tool(analysis_uuid)

        for input_file_uuid in tool.get_input_file_uuid_list():
            refinery_import_task = import_file.subtask((input_file_uuid,))
            refinery_import_tasks.append(refinery_import_task)
        refinery_import_taskset = TaskSet(
            tasks=refinery_import_tasks).apply_async()
        refinery_import_taskset.save()
        analysis_status.refinery_import_task_group_id = \
            refinery_import_taskset.taskset_id
        analysis_status.save()
        run_analysis.retry(countdown=RETRY_INTERVAL)

    # check if all files were successfully imported into Refinery
    refinery_import_taskset = get_taskset_result(
        analysis_status.refinery_import_task_group_id
    )
    if not refinery_import_taskset.ready():
        logger.debug("Input file import pending for analysis '%s'",
                     analysis)
        run_analysis.retry(countdown=RETRY_INTERVAL)

    elif not refinery_import_taskset.successful():
        error_msg = "Analysis '{}' failed during file import".format(
            analysis)
        logger.error(error_msg)
        analysis.set_status(Analysis.FAILURE_STATUS, error_msg)
        analysis.send_email()
        refinery_import_taskset.delete()


@task(base=AnalysisHandlerTask, max_retries=None)
def run_analysis(analysis_uuid):
    """
    Manage file importing/exporting, execution, and Galaxy operations for
    an Analysis
    """
    logger.info("Executing Analysis with UUID: ""%s", analysis_uuid)

    analysis = _get_analysis(analysis_uuid)

    # if cancelled by user
    if analysis.failed():
        analysis.terminate_file_import_tasks()
        return

    _get_analysis_status(analysis_uuid)
    _refinery_file_import(analysis_uuid)
    _run_galaxy_file_import(analysis_uuid)
    _run_galaxy_workflow(analysis_uuid)
    _check_galaxy_history_state(analysis_uuid)
    _galaxy_file_export(analysis_uuid)
    _attach_workflow_outputs(analysis_uuid)


def _run_galaxy_file_import(analysis_uuid):
    analysis = _get_analysis(analysis_uuid)
    analysis_status = _get_analysis_status(analysis_uuid)
    tool = _get_workflow_tool(analysis_uuid)

    if not analysis_status.galaxy_import_task_group_id:
        library_dict = tool.create_galaxy_library()
        history_dict = tool.create_galaxy_history()

        # Update Tool with information about its objects living in Galaxy
        tool.update_galaxy_data(tool.GALAXY_IMPORT_HISTORY_DICT, history_dict)
        tool.update_galaxy_data(tool.GALAXY_LIBRARY_DICT, library_dict)

        logger.debug("Starting file imports into Galaxy")

        galaxy_import_tasks = tool.get_galaxy_import_tasks()

        galaxy_file_import_taskset = TaskSet(
            tasks=galaxy_import_tasks
        ).apply_async()

        galaxy_file_import_taskset.save()

        analysis_status.set_galaxy_import_task_group_id(
            galaxy_file_import_taskset.taskset_id
        )
        analysis_status.set_galaxy_import_state(AnalysisStatus.PROGRESS)
        run_analysis.retry(countdown=RETRY_INTERVAL)

    # Check if data files were successfully imported into Galaxy
    galaxy_file_import_taskset = get_taskset_result(
        analysis_status.galaxy_import_task_group_id
    )
    if not galaxy_file_import_taskset.ready():
        logger.debug("Analysis '%s' pending in Galaxy", analysis)
        run_analysis.retry(countdown=RETRY_INTERVAL)
    elif not galaxy_file_import_taskset.successful():
        error_msg = "Analysis '{}' failed in Galaxy".format(analysis)
        logger.error(error_msg)
        analysis.set_status(Analysis.FAILURE_STATUS, error_msg)
        analysis_status.set_galaxy_import_state(AnalysisStatus.ERROR)
        analysis.send_email()
        get_taskset_result(
            analysis_status.refinery_import_task_group_id
        ).delete()
        galaxy_file_import_taskset.delete()
        analysis.galaxy_cleanup()
    else:
        analysis_status.set_galaxy_import_state(AnalysisStatus.OK)


def _run_galaxy_workflow(analysis_uuid):
    """
    Create DataSetCollection objects in galaxy, and invoke the workflow
    belonging to our tool.
    """
    analysis = _get_analysis(analysis_uuid)
    analysis_status = _get_analysis_status(analysis_uuid)
    tool = _get_workflow_tool(analysis_uuid)

    if not analysis_status.galaxy_workflow_task_group_id:
        logger.debug("Starting workflow execution in Galaxy")

        tool.update_file_relationships_with_galaxy_history_data()

        galaxy_workflow_tasks = [
            _invoke_galaxy_workflow.subtask((analysis_uuid,))
        ]

        galaxy_workflow_taskset = TaskSet(
            tasks=galaxy_workflow_tasks
        ).apply_async()

        galaxy_workflow_taskset.save()

        analysis_status.set_galaxy_workflow_task_group_id(
            galaxy_workflow_taskset.taskset_id
        )
        analysis_status.set_galaxy_history_state(AnalysisStatus.PROGRESS)
        run_analysis.retry(countdown=RETRY_INTERVAL)

    # Check on the status of the running galaxy workflow
    galaxy_workflow_taskset = get_taskset_result(
        analysis_status.galaxy_workflow_task_group_id
    )
    if not galaxy_workflow_taskset.ready():
        logger.debug("Analysis '%s' pending in Galaxy", analysis)
        run_analysis.retry(countdown=RETRY_INTERVAL)

    elif not galaxy_workflow_taskset.successful():
        error_msg = "Analysis '{}' failed in Galaxy".format(analysis)
        logger.error(error_msg)
        analysis.set_status(Analysis.FAILURE_STATUS, error_msg)
        analysis_status.set_galaxy_history_state(AnalysisStatus.ERROR)
        analysis.send_email()
        get_taskset_result(
            analysis_status.refinery_import_task_group_id
        ).delete()
        galaxy_workflow_taskset.delete()
        analysis.galaxy_cleanup()
        return


@task()
def _galaxy_file_import(analysis_uuid, file_store_item_uuid, history_dict,
                        library_dict):
    tool = _get_workflow_tool(analysis_uuid)
    try:
        file_store_item = FileStoreItem.objects.get(uuid=file_store_item_uuid)
    except (FileStoreItem.DoesNotExist,
            FileStoreItem.MultipleObjectsReturned) as e:
        logger.error("Couldn't fetch FileStoreItem from UUID: %s %s",
                     file_store_item_uuid, e)
        run_analysis.update_state(state=celery.states.FAILURE)
        return
    library_dataset_dict = tool.upload_datafile_to_library_from_url(
        library_dict["id"],
        core.utils.get_absolute_url(file_store_item.get_datafile_url())
    )
    history_dataset_dict = tool.import_library_dataset_to_history(
        history_dict["id"],
        library_dataset_dict[0]["id"]
    )
    tool = _get_workflow_tool(analysis_uuid)

    number_of_files = len(tool.get_input_file_uuid_list())
    single_file_percentage = (100 / number_of_files)

    analysis_status = _get_analysis_status(analysis_uuid)
    analysis_status.galaxy_import_progress = (
        analysis_status.galaxy_import_progress + single_file_percentage
    )
    analysis_status.save()

    if (analysis_status.galaxy_import_progress ==
            single_file_percentage * number_of_files):
        # Imports are complete at this point so update
        # `galaxy_import_progress` to `100`.
        analysis_status.galaxy_import_progress = 100
        analysis_status.save()

    galaxy_to_refinery_file_mapping = {
        tool.REFINERY_FILE_UUID: file_store_item_uuid,
        tool.GALAXY_DATASET_HISTORY_ID: history_dataset_dict["id"]
    }
    return galaxy_to_refinery_file_mapping


def _get_galaxy_download_task_ids(analysis):
    """Get file import tasks for Galaxy analysis results"""
    logger.debug("Preparing to download analysis results from Galaxy")
    task_id_list = []

    # retrieving list of files to download for workflow
    tool = _get_workflow_tool(analysis.uuid)
    tool.create_analysis_output_node_connections()

    galaxy_instance = analysis.workflow.workflow_engine.instance

    try:
        download_list = tool.get_galaxy_dataset_download_list()
    except galaxy.client.ConnectionError as exc:
        error_msg = (
            "Error downloading Galaxy history files for analysis '%s': %s"
        )
        logger.error(error_msg, analysis.name, exc.message)
        analysis.set_status(Analysis.FAILURE_STATUS, error_msg)
        analysis.galaxy_cleanup()
        return task_id_list
    # Iterating through files in current galaxy history
    for results in download_list:
        # download file if result state is "ok"
        if results['state'] == 'ok':
            file_extension = results["type"]
            result_name = "{}.{}".format(results['name'], file_extension)

            # size of file defined by galaxy
            file_size = results['file_size']
            # Determining tag if galaxy results should be download through
            # http or copying files directly to retrieve HTML files as zip
            # archives via dataset URL
            if galaxy_instance.local_download and file_extension != 'html':
                download_url = results['file_name']
            else:
                download_url = urlparse.urljoin(
                        galaxy_instance.base_url, '/'.join(
                                ['datasets', str(results['dataset_id']),
                                 'display?to_ext=txt']))

            file_store_item = FileStoreItem(source=download_url)

            # workaround to set the correct file type for zip archives of
            # FastQC HTML reports produced by Galaxy dynamically
            if file_extension == 'html':
                file_extension = 'zip'
            # assign file type manually since it cannot be inferred from source
            try:
                extension = FileExtension.objects.get(name=file_extension)
            except (FileExtension.DoesNotExist,
                    FileExtension.MultipleObjectsReturned) as exc:
                logger.warn("Could not assign type to file '%s' using "
                            "extension '%s': %s", file_store_item,
                            file_extension, exc)
            else:
                file_store_item.filetype = extension.filetype

            file_store_item.save()

            # adding history files to django model
            temp_file = AnalysisResult(analysis_uuid=analysis.uuid,
                                       file_store_uuid=file_store_item.uuid,
                                       file_name=result_name,
                                       file_type=file_extension)
            temp_file.save()
            analysis.results.add(temp_file)
            analysis.save()

            # downloading analysis results into file_store
            # only download files if size is greater than 1
            if file_size > 0:
                task_id = import_file.subtask(
                        (file_store_item.uuid, False, file_size)
                )
                task_id_list.append(task_id)

    return task_id_list
