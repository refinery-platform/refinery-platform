'''
Created on Apr 5, 2012

@author: nils
'''

import ast
import copy
from datetime import datetime
import json
import logging
import os
import socket
import urlparse

from django.conf import settings
from django.contrib.sites.models import Site
from django.core.urlresolvers import reverse
from django.template import loader, Context

from bioblend import galaxy
import celery
from celery.result import TaskSetResult
from celery.task import task
from celery.task.sets import subtask, TaskSet
from celery.utils import uuid

from analysis_manager.models import AnalysisStatus
from core.models import Analysis, AnalysisResult, WorkflowFilesDL, \
    AnalysisNodeConnection, INPUT_CONNECTION, OUTPUT_CONNECTION, Workflow, \
    Download
from data_set_manager.models import Node
from data_set_manager.utils import add_annotated_nodes_selection, \
    index_annotated_nodes_selection
from file_store.models import FileStoreItem, is_local, HTML, ZIP
from file_store.tasks import import_file, create, rename
from galaxy_connector.galaxy_workflow import countWorkflowSteps, \
    create_expanded_workflow_graph
from workflow_manager.tasks import configure_workflow


logger = logging.getLogger(__name__)


@task(max_retries=None)
def run_analysis(analysis_uuid):
    """Start and monitor analysis execution"""

    retry_interval = 5  # seconds

    try:
        analysis = Analysis.objects.get(uuid=analysis_uuid)
    except (Analysis.DoesNotExist, Analysis.MultipleObjectsReturned) as exc:
        logger.error("Can not retrieve analysis with UUID '%s': '%s'",
                     analysis_uuid, exc)
        run_analysis.update_state(state=celery.states.FAILURE)
        return

    # if user cancelled the analysis
    if analysis.failed():
        run_analysis.update_state(state=celery.states.FAILURE)
        return

    try:
        analysis_status = AnalysisStatus.objects.get(analysis=analysis)
    except (AnalysisStatus.DoesNotExist,
            AnalysisStatus.MultipleObjectsReturned) as exc:
        logger.error("Can not retrieve status for analysis '%s': '%s'",
                     analysis, exc)
        run_analysis.update_state(state=celery.states.FAILURE)
        return

    if not analysis_status.preprocessing_taskset_id:
        logger.info("Starting analysis '%s'", analysis)
        analysis.set_status(Analysis.RUNNING_STATUS)
        # import data files
        data_inputs = analysis.workflow_data_input_maps.all()
        file_import_task_list = []
        for files in data_inputs:
            cur_node_uuid = files.data_uuid
            cur_fs_uuid = Node.objects.get(uuid=cur_node_uuid).file_uuid
            file_import_task = import_file.subtask((cur_fs_uuid, False, ))
            file_import_task_list.append(file_import_task)
        logger.info("Starting input file import tasks for analysis '%s'",
                    analysis)
        file_import = TaskSet(tasks=file_import_task_list).apply_async()
        file_import.save()
        analysis_status.preprocessing_taskset_id = file_import.taskset_id
        analysis_status.save()

    # check if all files were successfully imported
    file_import = TaskSetResult.restore(
            analysis_status.preprocessing_taskset_id)
    if not file_import.ready():
        logger.debug("Input file import pending for analysis '%s'", analysis)
        run_analysis.retry(countdown=retry_interval)
    elif not file_import.successful():
        logger.error("Analysis '%s' failed during file import", analysis)
        analysis.set_status(Analysis.FAILURE_STATUS)
        file_import.delete()  # cleanup
        return

    # run analysis in Galaxy
    if not analysis_status.execution_taskset_id:
        logger.info("Sending analysis '%s' to Galaxy", analysis)
        try:
            prepare_galaxy_analysis(analysis)
        except galaxy.client.ConnectionError:
            return
        galaxy_task_list = [
            start_galaxy_analysis.subtask((analysis_uuid, )),
            monitor_galaxy_analysis.subtask((analysis_uuid, ))
        ]
        galaxy_analysis = TaskSet(tasks=galaxy_task_list).apply_async()
        galaxy_analysis.save()
        analysis_status.execution_taskset_id = galaxy_analysis.taskset_id
        analysis_status.save()

    # check if analysis has finished running in Galaxy successfully
    galaxy_analysis = TaskSetResult.restore(
            analysis_status.execution_taskset_id)
    if not galaxy_analysis.ready():
        logger.debug("Analysis '%s' pending in Galaxy", analysis)
        run_analysis.retry(countdown=retry_interval)
    # all tasks must have succeeded or failed
    elif not galaxy_analysis.successful():
        logger.error("Analysis '%s' failed in Galaxy", analysis)
        analysis.set_status(Analysis.FAILURE_STATUS)
        analysis.galaxy_cleanup()
        return

    # retrieve analysis results from Galaxy
    if not analysis_status.postprocessing_taskset_id:
        galaxy_task_list = download_history_files(analysis_uuid)
        logger.info("Starting downloading of results from Galaxy for analysis "
                    "'%s'", analysis)
        file_import = TaskSet(tasks=galaxy_task_list).apply_async()
        file_import.save()
        analysis_status.postprocessing_taskset_id = file_import.taskset_id
        analysis_status.save()

    # check if analysis results have finished downloading from Galaxy
    file_import = TaskSetResult.restore(
            analysis_status.postprocessing_taskset_id)
    if not file_import.ready():
        logger.debug("Results download pending for analysis '%s'", analysis)
        run_analysis.retry(countdown=retry_interval)
    # all tasks must have succeeded or failed
    elif not file_import.successful():
        logger.error("Analysis '%s' failed while downloading results from "
                     "Galaxy", analysis)
        analysis.set_status(Analysis.FAILURE_STATUS)
        analysis.galaxy_cleanup()
        return

    # Galaxy cleanup
    if not analysis_status.cleanup_taskset_id:
        galaxy_task_list = [run_analysis_cleanup.subtask((analysis_uuid, ))]
        logger.info("Starting Galaxy cleanup for analysis '%s'", analysis)
        galaxy_cleanup = TaskSet(tasks=galaxy_task_list).apply_async()
        galaxy_cleanup.save()
        analysis_status.cleanup_taskset_id = galaxy_cleanup.taskset_id
        analysis_status.save()

    # check if Galaxy cleanup has finished
    galaxy_cleanup = TaskSetResult.restore(analysis_status.cleanup_taskset_id)
    if not galaxy_cleanup.ready():
        logger.debug("Galaxy cleanup pending for analysis '%s'", analysis)
        run_analysis.retry(countdown=retry_interval)
    # all tasks must have succeeded or failed
    elif not galaxy_cleanup.successful():
        logger.error("Galaxy cleanup failed for analysis '%s'", analysis)

    logger.info("Analysis '%s' finished successfully", analysis)
    analysis.set_status(Analysis.SUCCESS_STATUS)
    file_import.delete()
    galaxy_analysis.delete()
    galaxy_cleanup.delete()
    rename_analysis_results(analysis)
    send_analysis_email(analysis)


@task()
def start_galaxy_analysis(analysis_uuid):
    """Perform execution (innermost task, does the actual work)"""
    logger.debug("Starting analysis execution in Galaxy")
    error_msg = "Analysis execution in Galaxy failed: "
    # replace with object manager method like get_item() for FileStoreItem?
    try:
        analysis = Analysis.objects.get(uuid=analysis_uuid)
    except (Analysis.DoesNotExist, Analysis.MultipleObjectsReturned) as exc:
        error_msg += "Error retrieving analysis with UUID '%s': '%s'"
        logger.error(error_msg, analysis_uuid, exc)
        # fail the task?
        return

    connection = analysis.galaxy_connection()
    # generates same ret_list purely based on analysis object
    ret_list = get_analysis_config(analysis)
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
    try:
        result = connection.workflows.run_workflow(
             workflow_id=analysis.workflow_galaxy_id,
             dataset_map=ds_map,
             history_id=analysis.history_id)
    except galaxy.client.ConnectionError as exc:
        error_msg += "error running Galaxy workflow for analysis '%s': %s"
        logger.error(error_msg, analysis.name, exc.message)
        start_galaxy_analysis.update_state(state=celery.states.FAILURE)


@task(max_retries=None)
def monitor_galaxy_analysis(analysis_uuid):
    """Monitor analysis execution in Galaxy"""

    retry_interval = 5  # seconds

    try:
        analysis = Analysis.objects.get(uuid=analysis_uuid)
    except (Analysis.DoesNotExist, Analysis.MultipleObjectsReturned) as exc:
        logger.error("Can not retrieve analysis with UUID '%s': '%s'",
                     analysis_uuid, exc)
        monitor_galaxy_analysis.update_state(state=celery.states.FAILURE)
        return

    # sanity check
    if analysis.failed():
        monitor_galaxy_analysis.update_state(state=celery.states.FAILURE)
        return

    try:
        analysis_status = AnalysisStatus.objects.get(analysis=analysis)
    except (AnalysisStatus.DoesNotExist,
            AnalysisStatus.MultipleObjectsReturned) as exc:
        logger.error("Can not retrieve status for analysis '%s': '%s'",
                     analysis, exc)
        monitor_galaxy_analysis.update_state(state=celery.states.FAILURE)
        return

    connection = analysis.galaxy_connection()
    try:
        history = connection.histories.get_status(analysis.history_id)
    except galaxy.client.ConnectionError as e:
        error_msg = "Unable to get progress for history %s of analysis %s: %s"
        logger.warning(
            error_msg, analysis.history_id, analysis.name, e.message)
        analysis.set_status(Analysis.UNKNOWN_STATUS, error_msg)
        monitor_galaxy_analysis.retry(countdown=retry_interval)

    percent_done = 0
    workflow_state = history['state']
    # number of steps in the workflow
    workflow_steps = len(json.loads(analysis.workflow.graph)['steps'])

    if workflow_state == u'ok':
        # number of steps in the workflow
        logger.debug("Total workflow steps: %s, OK data sets in history: %s",
                     workflow_steps, history['state_details'][u'ok'])
        logger.info("Analysis '%s' finished running in Galaxy", analysis)
        return

    if workflow_state == u'error':
        logger.error("Analysis '%s' failed in Galaxy", analysis)
        monitor_galaxy_analysis.update_state(state=celery.states.FAILURE)
        return

    if 'state_details' in history:
        total_datasets = sum(history['state_details'].itervalues())
        # don't report progress until Galaxy history has at least the
        # minimum number of datasets to avoid moving the progress bar
        # backward
        if total_datasets >= workflow_steps:
            percent_done = history['percent_complete']

    progress = {"percent_done": percent_done,
                "workflow_state": workflow_state}
    # if we are here then analysis is running
    monitor_galaxy_analysis.update_state(state="PROGRESS", meta=progress)
    # keep monitoring until workflow has finished running
    monitor_galaxy_analysis.retry(countdown=retry_interval)


@task
def download_history_files(analysis_uuid):
    """Download entire histories from Galaxy

    """
    logger.debug("Downloading files from Galaxy")
    error_msg = "Downloading files from Galaxy failed: "
    # replace with object manager method like get_item() for FileStoreItem?
    try:
        analysis = Analysis.objects.get(uuid=analysis_uuid)
    except (Analysis.DoesNotExist, Analysis.MultipleObjectsReturned) as exc:
        error_msg += "error retrieving analysis with UUID '%s': '%s'"
        logger.error(error_msg, analysis_uuid, exc)
        # fail the task?
        return

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
    task_list = []
    galaxy_instance = analysis.workflow.workflow_engine.instance
    try:
        download_list = galaxy_instance.get_history_file_list(
            analysis.history_id)
    except galaxy.client.ConnectionError as exc:
        error_msg = "Post-processing failed: error downloading "
        error_msg += "Galaxy history files for analysis '%s': %s"
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
                if galaxy_instance.local_download and file_type != HTML:
                    download_url = results['file_name']
                else:
                    url = 'datasets/' + str(results['dataset_id']) + \
                          '/display?to_ext=txt'
                    download_url = urlparse.urljoin(
                        galaxy_instance.base_url, url)
                # workaround to set the correct file type for zip archives of
                # FastQC HTML reports produced by Galaxy dynamically
                if file_type == HTML:
                    file_type = ZIP
                # TODO: when changing permanent=True, fix update of % download
                # of file
                filestore_uuid = create(
                    source=download_url, filetype=file_type, permanent=False)
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
                    # local download, force copying into the file_store instead
                    # of symlinking
                    if galaxy_instance.local_download:
                        task_id = import_file.subtask(
                            (filestore_uuid, False, True, file_size,))
                    else:
                        task_id = import_file.subtask(
                            (filestore_uuid, False, False, file_size,))
                    task_list.append(task_id)

    return task_list


@task()
def run_analysis_cleanup(analysis_uuid):
    """Perform cleanup, after download of results cleanup galaxy run"""
    logger.debug("Starting Galaxy cleanup")

    error_msg = "Galaxy cleanup failed: "
    # replace with object manager method like get_item() for FileStoreItem?
    try:
        analysis = Analysis.objects.get(uuid=analysis_uuid)
    except (Analysis.DoesNotExist, Analysis.MultipleObjectsReturned) as exc:
        error_msg += "error retrieving analysis with UUID '%s': '%s'"
        logger.error(error_msg, analysis_uuid, exc)
        return

    # attach workflow outputs back to dataset isatab graph
    if analysis.workflow.type == Workflow.ANALYSIS_TYPE:
        attach_outputs_dataset(analysis)
    elif analysis.workflow.type == Workflow.DOWNLOAD_TYPE:
        attach_outputs_downloads(analysis)
    else:
        logger.warning("Unknown workflow type '%s' in analysis '%s'",
                       analysis.workflow.type, analysis.name)

    analysis.galaxy_cleanup()
    return


def send_analysis_email(analysis):
    """Sends an email when the analysis finishes somehow or other
    :param analysis: Analysis object
    """
    # don't mail the user if analysis was canceled
    if analysis.cancel:
        return
    # get basic information
    user = analysis.get_owner()
    name = analysis.name
    site_name = Site.objects.get_current().name
    site_domain = Site.objects.get_current().domain
    status = analysis.status
    # check status and change text slightly based on that
    if status == Analysis.SUCCESS_STATUS:
        success = True
    else:
        success = False
    # set context for things needed in all emails
    context_dict = {'name': name,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'username': user.username,
                    'site_name': site_name,
                    'site_domain': site_domain,
                    'success': success
                    }
    if success:
        email_subj = "[%s] Archive ready for download: %s" % (site_name, name)
        context_dict['url'] = "http://%s%s" % (site_domain,
                                               reverse('core.views.analysis',
                                                       args=(analysis.uuid,)))
    else:
        email_subj = "[%s] Archive creation failed: %s" % (site_name, name)
        context_dict['default_email'] = settings.DEFAULT_FROM_EMAIL

    if settings.REFINERY_REPOSITORY_MODE:
        temp_loader = loader.get_template(
            'analysis_manager/analysis_email_repository.txt')
    else:
        workflow = analysis.workflow.name
        project = analysis.project

        # get information needed to calculate the duration
        start = analysis.time_start
        end = analysis.time_end
        duration = end - start
        hours, remainder = divmod(duration.total_seconds(), 3600)
        minutes, seconds = divmod(remainder, 60)

        # formatting the duration string
        hours = int(hours)
        minutes = int(minutes)
        if hours < 10:
            hours = '0%s' % hours
        if minutes < 10:
            minutes = '0%s' % minutes
        duration = "%s:%s hours" % (hours, minutes)

        # fill in extra context
        context_dict['workflow'] = workflow
        context_dict['project'] = project
        context_dict['dataset'] = analysis.data_set.name
        context_dict['start'] = datetime.strftime(start, '%A, %d %B %G %r')
        context_dict['end'] = datetime.strftime(end, '%A, %d %B %G %r')
        context_dict['duration'] = duration

        # get email contents ready
        email_subj = "[%s] %s: %s (%s)" % (site_name, status, name, workflow)
        temp_loader = loader.get_template(
            'analysis_manager/analysis_email_full.txt')

    context = Context(context_dict)
    try:
        user.email_user(email_subj, temp_loader.render(context))
    except socket.error:
        logger.error(
            "Email server error: " +
            "status '%s' to '%s' for analysis '%s' with UUID '%s'",
            analysis.status, user.email, name, analysis.uuid)
    else:
        logger.info(
            "Emailed completion message: " +
            "status '%s' to '%s' for analysis '%s' with UUID '%s'",
            analysis.status, user.email, name, analysis.uuid)


def prepare_galaxy_analysis(analysis):
    """Prepare analysis for execution in Galaxy"""
    logger.debug("Preparing Galaxy analysis '%s'", analysis)
    connection = analysis.galaxy_connection()
    error_msg = "Preparing Galaxy analysis failed: "

    # creates new library in galaxy
    library_name = "{} Analysis - {} ({})".format(
        Site.objects.get_current().name, analysis.uuid, datetime.now())
    try:
        library_id = connection.libraries.create_library(library_name)['id']
    except galaxy.client.ConnectionError as exc:
        error_msg += "error creating Galaxy library for analysis '%s': %s"
        logger.error(error_msg, analysis.name, exc.message)
        raise

    # generates same ret_list purely based on analysis object ###
    ret_list = get_analysis_config(analysis)
    try:
        workflow_dict = connection.workflows.export_workflow_json(
            analysis.workflow.internal_id)
    except galaxy.client.ConnectionError as exc:
        error_msg += "error downloading Galaxy workflow for analysis '%s': %s"
        logger.error(error_msg, analysis.name, exc.message)
        raise

    # getting expanded workflow configured based on input: ret_list
    new_workflow, history_download, analysis_node_connections = \
        configure_workflow(workflow_dict, ret_list)

    # import connections into database
    for analysis_node_connection in analysis_node_connections:
        # lookup node object
        if analysis_node_connection["node_uuid"]:
            node = Node.objects.get(uuid=analysis_node_connection["node_uuid"])
        else:
            node = None
        AnalysisNodeConnection.objects.create(
            analysis=analysis,
            subanalysis=analysis_node_connection['subanalysis'],
            node=node,
            step=int(analysis_node_connection['step']),
            name=analysis_node_connection['name'],
            filename=analysis_node_connection['filename'],
            filetype=analysis_node_connection['filetype'],
            direction=analysis_node_connection['direction'],
            is_refinery_file=analysis_node_connection['is_refinery_file']
            )
    # saving outputs of workflow to download
    for file_dl in history_download:
        temp_dl = WorkflowFilesDL(step_id=file_dl['step_id'],
                                  pair_id=file_dl['pair_id'],
                                  filename=file_dl['name'])
        temp_dl.save()
        analysis.workflow_dl_files.add(temp_dl)
        analysis.save()

    # import newly generated workflow
    try:
        new_workflow_info = connection.workflows.import_workflow_json(
            new_workflow)
    except galaxy.client.ConnectionError as exc:
        error_msg += "error importing workflow into Galaxy for analysis " \
                     "'%s': %s"
        logger.error(error_msg, analysis.name, exc.message)
        raise

    # getting number of steps for current workflow
    new_workflow_steps = countWorkflowSteps(new_workflow)

    # creates new history in galaxy
    history_name = "{} Analysis - {} ({})".format(
        Site.objects.get_current().name, analysis.uuid, datetime.now())
    try:
        history_id = connection.histories.create_history(history_name)['id']
    except galaxy.client.ConnectionError as e:
        error_msg += "error creating Galaxy history for analysis '%s': %s"
        logger.error(error_msg, analysis.name, e.message)
        raise

    # updating analysis object
    analysis.workflow_copy = new_workflow
    analysis.workflow_steps_num = new_workflow_steps
    analysis.workflow_galaxy_id = new_workflow_info['id']
    analysis.library_id = library_id
    analysis.history_id = history_id
    analysis.save()


def rename_analysis_results(analysis):
    """Rename files in file_store after download"""
    logger.debug("Renaming analysis results")
    # rename file_store items to new name updated from galaxy file_ids
    analysis_results = AnalysisResult.objects.filter(
        analysis_uuid=analysis.uuid)
    for result in analysis_results:
        # new name to load
        new_file_name = result.file_name
        # workaround for FastQC reports downloaded from Galaxy as zip archives
        (root, ext) = os.path.splitext(new_file_name)
        item = FileStoreItem.objects.get_item(uuid=result.file_store_uuid)
        if ext == '.html' and item.get_filetype() == ZIP:
            new_file_name = root + '.zip'
        rename(result.file_store_uuid, new_file_name)


def get_analysis_config(analysis):
    # TEST RECREATING RET_LIST DICTIONARY FROM ANALYSIS MODEL
    curr_workflow = analysis.workflow
    # getting distinct workflow inputs
    workflow_data_inputs = curr_workflow.data_inputs.all()
    annot_inputs = {}
    for data_input in workflow_data_inputs:
        input_type = data_input.name
        annot_inputs[input_type] = None

    ret_list = []
    ret_item = copy.deepcopy(annot_inputs)
    temp_count = 0
    temp_len = len(annot_inputs)
    t2 = analysis.workflow_data_input_maps.all().order_by('pair_id')
    for wd in t2:
        if ret_item[wd.workflow_data_input_name] is None:
            ret_item[wd.workflow_data_input_name] = {}
            ret_item[wd.workflow_data_input_name]['pair_id'] = wd.pair_id
            ret_item[wd.workflow_data_input_name]['node_uuid'] = wd.data_uuid
            temp_count += 1
        if temp_count == temp_len:
            ret_list.append(ret_item)
            ret_item = copy.deepcopy(annot_inputs)
            temp_count = 0
    return ret_list


def import_analysis_in_galaxy(ret_list, library_id, connection):
    """Take workflow configuration and import files into galaxy
    assign galaxy_ids to ret_list

    """
    logger.debug("Uploading analysis input files to Galaxy")
    for fileset in ret_list:
        for k, v in fileset.iteritems():
            cur_item = fileset[k]
            # getting the current file_uuid from the given node_uuid
            curr_file_uuid = Node.objects.get(
                uuid=cur_item['node_uuid']).file_uuid
            curr_filestore = FileStoreItem.objects.get_item(
                uuid=curr_file_uuid)
            if curr_filestore:
                file_path = curr_filestore.get_absolute_path()
                if file_path:
                    cur_item["filepath"] = file_path
                    try:
                        file_id =\
                            connection.libraries.upload_file_from_local_path(
                                library_id, file_path)[0]['id']
                    except (galaxy.client.ConnectionError, IOError) as exc:
                        logger.error("Failed adding file '%s' to Galaxy "
                                     "library '%s': %s",
                                     curr_file_uuid, library_id, exc)
                        raise
                    cur_item["id"] = file_id
                else:
                    error_msg = "Input file with UUID '{}' is not available"
                    error_msg = error_msg.format(curr_file_uuid)
                    raise RuntimeError(error_msg)
            else:
                error_msg = "Input file with UUID '{}' is not available"
                error_msg = error_msg.format(curr_file_uuid)
                raise RuntimeError(error_msg)
    return ret_list


def attach_outputs_downloads(analysis):
    analysis_results = AnalysisResult.objects.filter(
        analysis_uuid=analysis.uuid)

    if analysis_results.count() == 0:
        logger.error("No results for download '%s' ('%s')",
                     analysis.name, analysis.uuid)
        return

    for analysis_result in analysis_results:
        item = FileStoreItem.objects.get(uuid=analysis_result.file_store_uuid)
        if item:
            download = Download.objects.create(name=analysis.name,
                                               data_set=analysis.data_set,
                                               file_store_item=item)
            download.set_owner(analysis.get_owner())
        else:
            logger.warning(
                "No file found for '%s' in download '%s' ('%s')",
                analysis_result.file_store_uuid, analysis.name, analysis.uuid)


def attach_outputs_dataset(analysis):
    # for testing: attach workflow graph and output files to data set graph
    # 0. get study and assay from the first input node
    study = AnalysisNodeConnection.objects.filter(
        analysis=analysis, direction=INPUT_CONNECTION)[0].node.study
    assay = AnalysisNodeConnection.objects.filter(
        analysis=analysis, direction=INPUT_CONNECTION)[0].node.assay
    # 1. read workflow into graph
    graph = create_expanded_workflow_graph(
        ast.literal_eval(analysis.workflow_copy))
    # 2. create data transformation nodes for all tool nodes
    data_transformation_nodes = [graph.node[node_id]
                                 for node_id in graph.nodes()
                                 if graph.node[node_id]['type'] == "tool"]
    for data_transformation_node in data_transformation_nodes:
        # TODO: incorporate subanalysis id in tool name???
        data_transformation_node['node'] = Node.objects.create(
            study=study, assay=assay, analysis_uuid=analysis.uuid,
            type=Node.DATA_TRANSFORMATION,
            name=data_transformation_node['tool_id'] + '_' +
            data_transformation_node['name'])
    # 3. create connection from input nodes to first data transformation nodes
    # (input tool nodes in the graph are skipped)
    for input_connection in AnalysisNodeConnection.objects.filter(
            analysis=analysis, direction=INPUT_CONNECTION):
        for edge in graph.edges_iter([input_connection.step]):
            if (graph[edge[0]][edge[1]]['output_id'] ==
                    str(input_connection.step) + '_' +
                    input_connection.filename):
                input_node_id = edge[1]
                data_transformation_node = graph.node[input_node_id]['node']
                input_connection.node.add_child(data_transformation_node)
    # 4. create derived data file nodes for all entries and connect to data
    # transformation nodes
    for output_connection in AnalysisNodeConnection.objects.filter(
            analysis=analysis, direction=OUTPUT_CONNECTION):
        # create derived data file node
        derived_data_file_node = Node.objects.create(
            study=study, assay=assay, type=Node.DERIVED_DATA_FILE,
            name=output_connection.name, analysis_uuid=analysis.uuid,
            subanalysis=output_connection.subanalysis,
            workflow_output=output_connection.name)
        # retrieve uuid of corresponding output file if exists
        logger.info("Results for '%s' and %s.%s: %s",
                    analysis.uuid,
                    output_connection.filename, output_connection.filetype,
                    str(AnalysisResult.objects.filter(
                        analysis_uuid=analysis.uuid,
                        file_name=(output_connection.name + "." +
                                   output_connection.filetype)).count()))
        analysis_results = AnalysisResult.objects.filter(
            analysis_uuid=analysis.uuid,
            file_name=(output_connection.name + "." +
                       output_connection.filetype))

        if analysis_results.count() == 0:
            logger.info("No output file found for node '%s' ('%s')",
                        derived_data_file_node.name,
                        derived_data_file_node.uuid)

        if analysis_results.count() == 1:
            derived_data_file_node.file_uuid =\
                analysis_results[0].file_store_uuid
            logger.debug("Output file %s.%s ('%s') assigned to node %s ('%s')",
                         output_connection.name,
                         output_connection.filetype,
                         analysis_results[0].file_store_uuid,
                         derived_data_file_node.name,
                         derived_data_file_node.uuid)
        if analysis_results.count() > 1:
            logger.warning("Multiple output files returned for '%s.%s'." +
                           "No assignment to output node was made.",
                           output_connection.filename,
                           output_connection.filetype)
        output_connection.node = derived_data_file_node
        output_connection.save()
        # get graph edge that corresponds to this output node:
        # a. attach output node to source data transformation node
        # b. attach output node to target data transformation node (if exists)
        if len(graph.edges([output_connection.step])) > 0:
            for edge in graph.edges_iter([output_connection.step]):
                if (graph[edge[0]][edge[1]]['output_id'] ==
                        str(output_connection.step) + "_" +
                        output_connection.filename):
                    output_node_id = edge[0]
                    input_node_id = edge[1]
                    data_transformation_output_node = \
                        graph.node[output_node_id]['node']
                    data_transformation_input_node = \
                        graph.node[input_node_id]['node']
                    data_transformation_output_node.add_child(
                        derived_data_file_node)
                    derived_data_file_node.add_child(
                        data_transformation_input_node)
                    # TODO: here we could add a (Refinery internal) attribute
                    # to the derived data file node to indicate which output of
                    # the tool it corresponds to
        # connect outputs that are not inputs for any data transformation
        if (output_connection.is_refinery_file and
                derived_data_file_node.parents.count() == 0):
            graph.node[output_connection.step]['node'].add_child(
                derived_data_file_node)
        # delete output nodes that are not refinery files and don't have any
        # children
        if (not output_connection.is_refinery_file and
                derived_data_file_node.children.count() == 0):
            output_connection.node.delete()

    # 5. create annotated nodes and index new nodes
    node_uuids = AnalysisNodeConnection.objects.filter(
        analysis=analysis, direction=OUTPUT_CONNECTION, is_refinery_file=True
        ).values_list('node__uuid', flat=True)
    add_annotated_nodes_selection(
        node_uuids, Node.DERIVED_DATA_FILE, study.uuid, assay.uuid)
    index_annotated_nodes_selection(node_uuids)
