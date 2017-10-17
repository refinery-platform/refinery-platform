import json
import logging
import os
import re
import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.http import HttpResponseServerError
from django.utils import timezone

import jsonschema
import requests
from requests.packages.urllib3.exceptions import HTTPError

from core.models import (Analysis, NodeRelationship, NodeSet, Study, Workflow,
                         WorkflowDataInputMap)
from core.utils import get_aware_local_time
import tool_manager

logger = logging.getLogger(__name__)


def create_analysis(validated_analysis_config):
    """
    Create an Analysis instance from a properly validated analysis_config
    :param validated_analysis_config: a dict including the necessary
    information to create an Analysis that has been validated prior by
    `analysis_manager.utils.validate_analysis_config`
    :return: an Analysis instance
    :raises: RuntimeError
    """
    common_analysis_objects = fetch_objects_required_for_analysis(
        validated_analysis_config
    )
    current_workflow = common_analysis_objects["current_workflow"]
    data_set = common_analysis_objects["data_set"]
    user = common_analysis_objects["user"]

    try:
        tool = tool_manager.models.WorkflowTool.objects.get(
            uuid=validated_analysis_config["tool_uuid"]
        )
    except (tool_manager.models.WorkflowTool.DoesNotExist,
            tool_manager.models.WorkflowTool.MultipleObjectsReturned) as e:
        raise RuntimeError("Couldn't fetch Tool from UUID: {}".format(e))

    analysis = Analysis.objects.create(
        uuid=str(uuid.uuid4()),
        summary="Galaxy workflow execution for: {}".format(tool.name),
        name="{} - {} - {}".format(
            tool.get_tool_name(),
            get_aware_local_time().strftime("%Y/%m/%d %H:%M:%S"),
            tool.get_owner_username().title()
        ),
        project=user.profile.catch_all_project,
        data_set=data_set,
        workflow=current_workflow,
        time_start=timezone.now()
    )
    analysis.set_owner(user)
    return analysis


def fetch_objects_required_for_analysis(validated_analysis_config):
    """
    fetch common objects required for all Analyses
    :param validated_analysis_config:
    :return: dict w/ mapping to the commonly used objects
    :raises: RuntimeError
    """
    study_uuid = validated_analysis_config["study_uuid"]
    user_id = validated_analysis_config["user_id"]
    workflow_uuid = validated_analysis_config["workflow_uuid"]

    try:
        user = User.objects.get(id=user_id)
    except(User.DoesNotExist, User.MultipleObjectsReturned) as e:
        raise RuntimeError(
            "Couldn't fetch User from id: {} {}".format(user_id, e)
        )

    try:
        current_workflow = Workflow.objects.get(uuid=workflow_uuid)
    except(Workflow.DoesNotExist, Workflow.MultipleObjectsReturned) as e:
        raise RuntimeError(
            "Couldn't fetch Workflow from UUID: {} {}".format(workflow_uuid, e)
        )

    try:
        study = Study.objects.get(uuid=study_uuid)
    except(Study.DoesNotExist, Study.MultipleObjectsReturned) as e:
        raise RuntimeError(
            "Couldn't fetch Study {}: {}".format(study_uuid, e)
        )

    data_set = study.get_dataset()

    return {
        "user": user,
        "current_workflow": current_workflow,
        "data_set": data_set,
    }


def get_solr_results(query, facets=False, jsonp=False, annotation=False,
                     only_uuids=False, selected_mode=True,
                     selected_nodes=None):
    """Helper function for taking solr request url.
    Removes facet requests, converts to json, from input solr query
    :param query: solr http query string
    :type query: string
    :param facets: Removes facet query from solr query string
    :type facets: boolean
    :param jsonp: Removes JSONP query from solr query string
    :type jsonp: boolean
    :param only_uuids: Returns list of file_uuids from all solr results
    :type only_uuids: boolean
    :param selected_mode: UI selection mode (blacklist or whitelist)
    :type selected_mode: boolean
    :param selected_nodes: List of UUIDS to remove from the solr query
    :type selected_nodes: array
    :returns: dictionary of current solr results
    """
    if not facets:
        # replacing facets w/ false
        query = query.replace('facet=true', 'facet=false')
    if not jsonp:
        # ensuring json not jsonp response
        query = query.replace('&json.wrf=?', '')
    if annotation:
        # changing annotation
        query = query.replace('is_annotation:false', 'is_annotation:true')
    # Checks for limit on solr query
    # replaces i.e. '&rows=20' to '&rows=10000'
    m_obj = re.search(r"&rows=(\d+)", query)
    if m_obj:
        # TODO: replace 10000 with settings parameter for max solr results
        replace_rows_str = '&rows=' + str(10000)
        query = query.replace(m_obj.group(), replace_rows_str)

    try:
        # opening solr query results
        results = requests.get(query, stream=True)
        results.raise_for_status()
    except HTTPError as e:
        logger.error(e)
        return HttpResponseServerError(e)

    # converting results into json for python
    results = json.loads(results.content)

    # IF list of nodes to remove from query exists
    if selected_nodes:
        # need to iterate over list backwards to properly delete from a list
        for i in xrange(len(results["response"]["docs"]) - 1, -1, -1):
            node = results["response"]["docs"][i]

            # blacklist mode (remove uuid's from solr query)
            if selected_mode:
                if 'uuid' in node:
                    # if the current node should be removed from the results
                    if node['uuid'] in selected_nodes:
                        del results["response"]["docs"][i]
                        # num_found -= 1
            # whitelist mode (add's uuids from solr query)
            else:
                if 'uuid' in node:
                    # if the current node should be removed from the results
                    if node['uuid'] not in selected_nodes:
                        del results["response"]["docs"][i]
                        # num_found += 1
    # Will return only list of file_uuids
    if only_uuids:
        ret_file_uuids = []
        solr_results = results["response"]["docs"]
        for res in solr_results:
            ret_file_uuids.append(res["uuid"])
        return ret_file_uuids

    return results


def validate_analysis_config(analysis_config):
    """
    Validate incoming Analysis Configurations
    No exception handling since this function is called within the atomic
    transaction of a `WorkflowTool.launch()`
    :param analysis_config: json data containing an Analysis configuration
    """
    with open(
            os.path.join(
                settings.BASE_DIR,
                "refinery/analysis_manager/schemas/AnalysisConfig.json"
            )
    ) as f:
        schema = json.loads(f.read())
    try:
        jsonschema.validate(analysis_config, schema)
    except jsonschema.ValidationError as e:
        raise RuntimeError(
            "Analysis Configuration is invalid: {}".format(e)
        )


def _associate_workflow_data_inputs(analysis, current_workflow, solr_uuids):
    """
    Associate data inputs with the Analysis through the WorkflowDatainputMap
    model
    :param analysis: an Analysis instance
    :param current_workflow: <Workflow> instance
    :param solr_uuids: List of UUIDs corresponding to Node's file_uuids
    """
    # getting distinct workflow inputs
    workflow_data_inputs = current_workflow.data_inputs.all()[0]

    # NEED TO GET LIST OF FILE_UUIDS from solr query
    count = 0
    for file_uuid in solr_uuids:
        count += 1
        temp_input = WorkflowDataInputMap.objects.create(
            workflow_data_input_name=workflow_data_inputs.name,
            data_uuid=file_uuid,
            pair_id=count
        )
        analysis.workflow_data_input_maps.add(temp_input)
        analysis.save()


def _create_analysis_name(current_workflow):
    """
    Create an string representative of an Analysis
    :param current_workflow: The <Workflow> associated with said Analysis
    :return: String comprised of the workflow's name and a timestamp
    """
    return "{} {}".format(
        current_workflow.name,
        get_aware_local_time().strftime("%Y-%m-%d @ %H:%M:%S")
    )


def _fetch_node_relationship(node_relationship_uuid):
    """
    Fetches a NodeRelationship instance from a given UUID
    :param node_relationship_uuid: UUID String
    :return: <NodeRelationship>
    :raises: RuntimeError
    """
    try:
        return NodeRelationship.objects.get(uuid=node_relationship_uuid)
    except(NodeRelationship.DoesNotExist,
           NodeRelationship.MultipleObjectsReturned) as e:
        raise RuntimeError(
            "Couldn't fetch NodeRelationship from UUID: {} {}"
            .format(node_relationship_uuid, e)
        )


def _fetch_node_set(node_set_uuid):
    """
    Fetches a NodeSet instance from a given UUID
    :param node_set_uuid: UUID String
    :return: <NodeSet>
    :raises: RuntimeError
    """
    try:
        return NodeSet.objects.get(uuid=node_set_uuid)
    except(NodeSet.DoesNotExist, NodeSet.MultipleObjectsReturned) as e:
        raise RuntimeError(
            "Couldn't fetch NodeSet from UUID: {} {}".format(node_set_uuid, e)
        )


def _fetch_solr_uuids(nodeset_instance):
    """
    Fetches solr_uuids from a given NodeSet instance
    :param nodeset_instance: <NodeSet> instance
    :return: list of UUIDs corresponding to Nodes indexed in Solr
    """
    curr_node_dict = json.loads(nodeset_instance.solr_query_components)
    return get_solr_results(
        nodeset_instance.solr_query,
        only_uuids=True,
        selected_mode=curr_node_dict['documentSelectionBlacklistMode'],
        selected_nodes=curr_node_dict['documentSelection']
    )
