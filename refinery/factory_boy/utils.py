import uuid as uuid_builtin

from core.models import INPUT_CONNECTION, OUTPUT_CONNECTION, Analysis
from data_set_manager.models import Node
from factory_boy.django_model_factories import (
    AnalysisFactory, AnalysisNodeConnectionFactory, AnalysisResultFactory,
    AnalysisStatusFactory, AnnotatedNodeFactory, AssayFactory,
    AttributeFactory, DataSetFactory, FileRelationshipFactory,
    FileStoreItemFactory, GalaxyInstanceFactory, InvestigationFactory,
    InvestigationLinkFactory, NodeFactory, ProjectFactory, StudyFactory,
    ToolDefinitionFactory, VisualizationToolFactory, WorkflowEngineFactory,
    WorkflowFactory, WorkflowToolFactory
)
from tool_manager.models import ToolDefinition


def create_analysis(project, dataset, workflow, user_instance):
    analysis_uuid = str(uuid_builtin.uuid4())
    analysis = AnalysisFactory(
        uuid=analysis_uuid,
        name="Test Analysis - {}".format(analysis_uuid),
        project=project,
        data_set=dataset,
        workflow=workflow
    )
    input_node = dataset.get_nodes().first()
    AnalysisNodeConnectionFactory(
        direction=INPUT_CONNECTION,
        node=input_node,
        name="Connection to {}".format(input_node),
        analysis=analysis,
        step=0,
        filename="Input filename",
        is_refinery_file=input_node.get_file_store_item().is_local()
    )

    # create Analysis Output
    file_store_item_uuid = str(uuid_builtin.uuid4())
    FileStoreItemFactory(
        uuid=file_store_item_uuid,
        source="http://www.example.com/analysis_output.txt"
    )
    output_node = NodeFactory(
        analysis_uuid=analysis_uuid,
        study=dataset.get_latest_study(),
        assay=dataset.get_latest_assay(),
        file_uuid=file_store_item_uuid,
        type=Node.DERIVED_DATA_FILE
    )

    AnalysisNodeConnectionFactory(
        direction=OUTPUT_CONNECTION,
        node=output_node,
        name="Connection to {}".format(output_node),
        analysis=analysis,
        step=1,
        filename="Output filename",
        is_refinery_file=True
    )
    AnalysisResultFactory(
        analysis_uuid=analysis.uuid,
        file_store_uuid=file_store_item_uuid
    )

    # create AnalysisStatus
    AnalysisStatusFactory(analysis=analysis)

    analysis.set_owner(user_instance)
    analysis.save()


def make_analyses_with_single_dataset(number_to_create, user_instance):
    """Create some minimal Analyses"""

    instance = GalaxyInstanceFactory()
    workflow_engine = WorkflowEngineFactory(instance=instance)
    workflow = WorkflowFactory(uuid=str(uuid_builtin.uuid4()),
                               workflow_engine=workflow_engine)
    project = ProjectFactory(is_catch_all=True)
    dataset = create_dataset_with_necessary_models(user=user_instance)

    while number_to_create:
        create_analysis(project, dataset, workflow, user_instance)
        number_to_create -= 1

    return Analysis.objects.all(), dataset


def create_dataset_with_necessary_models(
        create_nodes=True, is_isatab_based=False, user=None, slug=None,
        latest_version=1
):
    """Create Dataset with InvestigationLink, Investigation, Study,
    and Assay"""
    dataset_uuid = str(uuid_builtin.uuid4())
    dataset = DataSetFactory(
        uuid=dataset_uuid,
        title="Test DataSet - {}".format(dataset_uuid),
        name="Test DataSet - {}".format(dataset_uuid),
        slug=slug
    )

    latest_study = _create_dataset_objects(
        dataset,
        is_isatab_based,
        latest_version
    )

    assay_uuid = str(uuid_builtin.uuid4())
    assay = AssayFactory(uuid=assay_uuid, study=latest_study)

    if create_nodes:
        for i in xrange(2):
            file_store_item_uuid = str(uuid_builtin.uuid4())
            FileStoreItemFactory(
                uuid=file_store_item_uuid,
                source="http://www.example.com/test{}.txt".format(i)
            )
            node = NodeFactory(
                study=latest_study,
                assay=assay,
                file_uuid=file_store_item_uuid,
                type=Node.RAW_DATA_FILE
            )
            attribute = AttributeFactory(
                node=node,
                type="Characteristics",
                subtype="organism",
                value="Human"
            )
            AnnotatedNodeFactory(
                study=latest_study,
                assay=assay,
                node=node,
                node_name='AnnotatedNode-{}'.format(i),
                node_type=node.type,
                attribute=attribute
            )

    if user is not None:
        dataset.set_owner(user)
        dataset.save()

    return dataset


def _create_dataset_objects(dataset, is_isatab_based, latest_version):
    for i in xrange(1, latest_version+1):
        file_store_item_uuid = str(uuid_builtin.uuid4())
        file_store_item = FileStoreItemFactory(
            uuid=file_store_item_uuid,
            source="http://www.example.com/test.{}".format(
                "zip" if is_isatab_based else "csv"
            )
        )
        investigation_uuid = str(uuid_builtin.uuid4())
        investigation = InvestigationFactory(
            uuid=investigation_uuid,
            isarchive_file=file_store_item.uuid if is_isatab_based else None,
            pre_isarchive_file=(
                None if is_isatab_based else file_store_item.uuid
            ),
            identifier="{}: Investigation identifier".format(dataset),
            description="{}: Investigation description".format(dataset),
            title="{}: Investigation title".format(dataset)
        )

        study_uuid = str(uuid_builtin.uuid4())
        study = StudyFactory(
            uuid=study_uuid,
            investigation=investigation,
            identifier="{}: Study identifier".format(dataset),
            description="{}: Study description".format(dataset),
            title="{}: Study title".format(dataset)
        )
        InvestigationLinkFactory(
            data_set=dataset,
            investigation=investigation,
            version=i
        )
    return study


def create_tool_with_necessary_models(tool_type, user=None):
    """
    Create a minimal representation of a Visualization/Workflow
    Tool for use in tests.
    :param tool_type: The type of tool to create.
    Must be one of: ["VISUALIZATION", "WORKFLOW"]
    :returns: WorkflowTool/VisualizationTool instance
    """
    if tool_type not in [ToolDefinition.WORKFLOW,
                         ToolDefinition.VISUALIZATION]:
        raise RuntimeError("Invalid tool_type")

    tool_type_to_factory_mapping = {
        ToolDefinition.WORKFLOW: WorkflowToolFactory,
        ToolDefinition.VISUALIZATION: VisualizationToolFactory
    }
    tool_factory = tool_type_to_factory_mapping[tool_type]
    name = "Test {} Tool: {}".format(tool_type, uuid_builtin.uuid4())

    tool = tool_factory(
        tool_definition=ToolDefinitionFactory(
            tool_type=tool_type,
            name=name,
            file_relationship=FileRelationshipFactory()
        ),
        display_name=name,
        dataset=create_dataset_with_necessary_models(user=user)
    )
    if user is not None:
        tool.set_owner(user)
    return tool


def create_hg_19_data_set(user=None):
    dataset_uuid = str(uuid_builtin.uuid4())
    dataset = DataSetFactory(
        uuid=dataset_uuid,
        title="hg-19 - {}".format(dataset_uuid),
        name="Replica of hg-19 DataSet - {}".format(dataset_uuid),
        slug=None
    )

    latest_study = _create_dataset_objects(dataset, False, 1)

    assay_uuid = str(uuid_builtin.uuid4())
    assay = AssayFactory(uuid=assay_uuid, study=latest_study,
                         file_name='hg19-metadata-local.txt')

    node_names = ['s5_p42_E2_45min',
                  's7_EV_E2_45min',
                  's5_p42_E2_45min.subsample',
                  's7_EV_E2_45min.subsample']

    for name in node_names:
        source_name_node = NodeFactory(study=latest_study,
                                       assay=None,
                                       file_uuid=None,
                                       type=Node.SOURCE,
                                       name=name)

        sample_name_node = NodeFactory(study=latest_study,
                                       assay=None,
                                       file_uuid=None,
                                       type=Node.SAMPLE,
                                       name=name + '.fastq.gz')

        assay_name_node = NodeFactory(study=latest_study,
                                      assay=assay,
                                      file_uuid=None,
                                      type=Node.ASSAY,
                                      name=name + '.fastq.gz')

        file_store_item_uuid = str(uuid_builtin.uuid4())
        FileStoreItemFactory(
            uuid=file_store_item_uuid,
            source="/{}.fastq.gz".format(name)
        )

        node = NodeFactory(
            study=latest_study,
            assay=assay,
            file_uuid=file_store_item_uuid,
            type=Node.RAW_DATA_FILE,
            name=name + '.fastq.gz'
        )

        source_name_node.add_child(sample_name_node)
        sample_name_node.add_child(assay_name_node)
        assay_name_node.add_child(node)
        attribute_organism = AttributeFactory(
            node=node,
            type="Characteristics",
            subtype="organism",
            value="Human"
        )

        AnnotatedNodeFactory(assay=assay,
                             attribute=attribute_organism,
                             attribute_type=attribute_organism.type,
                             attribute_subtype=attribute_organism.subtype,
                             attribute_value=attribute_organism.value,
                             node=node,
                             node_file_uuid=node.file_uuid,
                             node_name=node.name,
                             node_type=node.type,
                             node_uuid=node.uuid,
                             study=latest_study)

        attribute_sample = AttributeFactory(
            node=node,
            type="Characteristics",
            subtype="sample id",
            value=name
        )

        AnnotatedNodeFactory(assay=assay,
                             attribute=attribute_sample,
                             attribute_type=attribute_sample.type,
                             attribute_subtype=attribute_sample.subtype,
                             attribute_value=attribute_sample.value,
                             node=node,
                             node_file_uuid=node.file_uuid,
                             node_name=node.name,
                             node_type=node.type,
                             node_uuid=node.uuid,
                             study=latest_study)

    if user is not None:
        dataset.set_owner(user)
        dataset.save()

    return dataset
