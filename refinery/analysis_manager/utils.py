import json
import logging
import os
import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone

import jsonschema

from core.models import Analysis, Study, Workflow
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
