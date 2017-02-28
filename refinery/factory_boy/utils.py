from datetime import datetime
import uuid as uuid_builtin

from core.models import DataSet, Analysis

from factory_boy.django_model_factories import (
    DataSetFactory, InvestigationFactory, StudyFactory,
    InvestigationLinkFactory, GalaxyInstanceFactory, WorkflowEngineFactory,
    WorkflowFactory, ProjectFactory, AnalysisFactory,
    FileRelationshipFactory, InputFileFactory,
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
            workflow=workflow
        )

        number_to_create -= 1

    for dataset in DataSet.objects.all():
        dataset.set_owner(user_instance)
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

def make_sample_tool_definitions():
    """Generate two sample ToolDefinitions. A LIST:LIST:PAIR and a LIST:PAIR"""

    bam_filetype = FileType.objects.get(name="BAM")
    bed_filetype = FileType.objects.get(name="BED")
    fastq_filetype = FileType.objects.get(name="FASTQ")

    # Make LIST:PAIR TD
    pair_relationship1 = FileRelationshipFactory(
        name="ChIP vs Input Pair", value_type="PAIR")

    input1 = InputFileFactory(
        name="ChIP file",
        description="File with actual signal")
    input1.allowed_filetypes.add(bam_filetype, fastq_filetype)

    input2 = InputFileFactory(
        name="Input file",
        description="File with background signal")
    input2.allowed_filetypes.add(bam_filetype, fastq_filetype)

    pair_relationship1.input_files.add(input1, input2)

    list_relationship1 = FileRelationshipFactory(
        name="List of Paired Samples", value_type="LIST")
    list_relationship1.file_relationship.add(pair_relationship1)
    tool_definition1 = ToolDefinitionFactory(
        name="Chip Seq <list:pair>", description="Chip Seq using MACS2",
        tool_type="WORKFLOW", file_relationship=list_relationship1)

    p1 = ParameterFactory(
        name="Genome Build",
        description="The genome build to use for this workflow."
                    " Has to be installed in Galaxy workflow "
                    "engine.",
        value_type="GENOME_BUILD",
        default_value="hg19",
        galaxy_tool_id="CHIP SEQ XXX",
        galaxy_tool_parameter="genome_build")
    o1 = OutputFileFactory(
        name="broadpeaks.bed",
        description="Peaks called by MACS2",
        filetype=bed_filetype,
    )
    tool_definition1.output_files.add(o1)
    tool_definition1.parameters.add(p1)

    # Make LIST:LIST:PAIR TD
    pair_relationship2 = FileRelationshipFactory(
        name="Generic Pair", value_type="PAIR")

    input1a = InputFileFactory(
        name="Input A",
        description="Input A desc")
    input1a.allowed_filetypes.add(fastq_filetype)

    input1b = InputFileFactory(
        name="Input B",
        description="Input B desc")
    input1b.allowed_filetypes.add(fastq_filetype)

    pair_relationship2.input_files.add(input1a, input1b)

    list_relationship2b = FileRelationshipFactory(
        name="List of Paired Samples", value_type="LIST")
    list_relationship2b.file_relationship.add(pair_relationship2)

    list_relationship2a = FileRelationshipFactory(
        name="List of Lists", value_type="LIST")
    list_relationship2a.file_relationship.add(list_relationship2b)

    tool_definition2 = ToolDefinitionFactory(
        name="Sample <list:list:pair> Tool",
        description="<list:list:pair> desc",
        tool_type="WORKFLOW", file_relationship=list_relationship2a)

    p2 = ParameterFactory(name="Generic Param",
                          description="Generic Param Desc",
                          value_type="BOOLEAN",
                          default_value=True,
                          galaxy_tool_id="Generic XXX",
                          galaxy_tool_parameter="generic_param")
    o2 = OutputFileFactory(
        name="generic.bed",
        description="Generic output desc",
        filetype=bed_filetype,
    )
    tool_definition2.output_files.add(o2)
    tool_definition2.parameters.add(p2)
