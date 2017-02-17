from datetime import datetime
import random
import uuid as uuid_builtin

from django.contrib.auth.models import Group

from core.models import DataSet, Analysis

from factory_boy.django_model_factories import (
    DataSetFactory, InvestigationFactory, StudyFactory,
    InvestigationLinkFactory, GalaxyInstanceFactory, WorkflowEngineFactory,
    WorkflowFactory, ProjectFactory, AnalysisFactory,
    FileRelationshipFactory,  InputFileFactory,
    ToolDefinitionFactory, ParameterFactory, OutputFileFactory)
from file_store.models import FileType


def make_datasets(number_to_create, user_instance):
    """Create some minimal DataSets"""
    while number_to_create:

        create_dataset_with_necessary_models()
        number_to_create -= 1

    for dataset in DataSet.objects.all():
        dataset.set_owner(user_instance)
        dataset.save()


def make_analyses_with_single_dataset(number_to_create, user_instance):
    """Create some minimal Analyses"""

    status_choices = Analysis.STATUS_CHOICES
    instance = GalaxyInstanceFactory()
    workflow_engine = WorkflowEngineFactory(instance=instance)
    workflow = WorkflowFactory(uuid=uuid_builtin.uuid4(),
                               workflow_engine=workflow_engine)
    project = ProjectFactory(is_catch_all=True)
    dataset = create_dataset_with_necessary_models()

    while number_to_create:
        analysis_uuid = uuid_builtin.uuid4()
        AnalysisFactory(
            uuid=analysis_uuid,
            name="Test Analysis - {}".format(analysis_uuid),
            project=project,
            data_set=dataset,
            workflow=workflow,
            status=random.choice(status_choices)[0]
        )

        number_to_create -= 1

    for dataset in DataSet.objects.all():
        dataset.set_owner(user_instance)
        dataset.share(group=Group.objects.get(name="Public"))
        dataset.save()

    for analysis in Analysis.objects.all():
        analysis.set_owner(user_instance)
        analysis.save()


def create_dataset_with_necessary_models():
    """Create Dataset with Investigation, Study, and Investigation Link"""
    dataset_uuid = uuid_builtin.uuid4()
    dataset = DataSetFactory(
        uuid=dataset_uuid,
        title="Test DataSet - {}".format(dataset_uuid),
        name="Test DataSet - {}".format(dataset_uuid)
    )

    investigation_uuid = uuid_builtin.uuid4()
    investigation = InvestigationFactory(uuid=investigation_uuid)

    study_uuid = uuid_builtin.uuid4()
    StudyFactory(uuid=study_uuid, investigation=investigation)

    InvestigationLinkFactory(
        data_set=dataset,
        investigation=investigation,
        version=1,
        date=datetime.now()
    )
    return dataset


def make_tool_definitions():
    bam_filetype = FileType.objects.get(name="BAM")
    bed_filetype = FileType.objects.get(name="BED")
    fastq_filetype = FileType.objects.get(name="FASTQ")

    pair_relationship = FileRelationshipFactory(
        name="ChIP vs Input Pair", value_type="PAIR")

    i1 = InputFileFactory(
        name="ChIP file",
        description="File with actual signal",
        file_relationship=pair_relationship)
    i1.allowed_filetypes.add(bam_filetype, fastq_filetype)

    i2 = InputFileFactory(
        name="Input file",
        description="File with background signal",
        file_relationship=pair_relationship)
    i2.allowed_filetypes.add(bam_filetype, fastq_filetype)

    list_relationship = FileRelationshipFactory(
        name="List of Paired Samples", value_type="LIST")
    list_relationship.nested_elements.add(pair_relationship)
    tool_definition = ToolDefinitionFactory(
        name="Chip Seq", description="Chip Seq using MACS2",
        tool_type="WORKFLOW", file_relationships=list_relationship)

    ParameterFactory(name="Genome Build",
                     description="The genome build to use for this workflow."
                                 " Has to be installed in Galaxy workflow "
                                 "engine.",
                     value_type="GENOME_BUILD",
                     default_value="hg19",
                     galaxy_tool_id="CHIP SEQ XXX",
                     galaxy_tool_parameter="genome_build",
                     tool_definition=tool_definition)
    OutputFileFactory(
        name="broadpeaks.bed",
        description="Peaks called by MACS2",
        filetype=bed_filetype,
        tool_definition=tool_definition
    )
