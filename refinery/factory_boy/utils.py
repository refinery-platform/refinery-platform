import uuid as uuid_lib

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
    analysis_uuid = str(uuid_lib.uuid4())
    analysis = AnalysisFactory(uuid=analysis_uuid,
                               name='Test Analysis - {}'.format(analysis_uuid),
                               project=project, data_set=dataset,
                               workflow=workflow)
    input_node = dataset.get_nodes().first()
    AnalysisNodeConnectionFactory(analysis=analysis, node=input_node, step=0,
                                  name='Connection to {}'.format(input_node),
                                  filename='Input filename',
                                  direction=INPUT_CONNECTION,
                                  is_refinery_file=bool(
                                      input_node.file.datafile
                                  ))
    # create Analysis Output
    file_store_item_uuid = str(uuid_lib.uuid4())
    FileStoreItemFactory(uuid=file_store_item_uuid,
                         source='http://www.example.com/analysis_output.txt')
    output_node = NodeFactory(analysis_uuid=analysis_uuid,
                              study=dataset.get_latest_study(),
                              assay=dataset.get_latest_assay(),
                              file_uuid=file_store_item_uuid,
                              type=Node.DERIVED_DATA_FILE)
    AnalysisNodeConnectionFactory(direction=OUTPUT_CONNECTION,
                                  node=output_node,
                                  name="Connection to {}".format(output_node),
                                  analysis=analysis, step=1,
                                  filename="Output filename",
                                  is_refinery_file=True)
    AnalysisResultFactory(analysis=analysis,
                          file_store_uuid=file_store_item_uuid)
    AnalysisStatusFactory(analysis=analysis)
    analysis.set_owner(user_instance)
    analysis.save()


def make_analyses_with_single_dataset(number_to_create, user_instance):
    """Create some minimal Analyses"""

    instance = GalaxyInstanceFactory()
    workflow_engine = WorkflowEngineFactory(instance=instance)
    workflow = WorkflowFactory(uuid=str(uuid_lib.uuid4()),
                               workflow_engine=workflow_engine)
    project = ProjectFactory(is_catch_all=True)
    dataset = create_dataset_with_necessary_models(user=user_instance)

    while number_to_create:
        create_analysis(project, dataset, workflow, user_instance)
        number_to_create -= 1

    return Analysis.objects.all(), dataset


def create_dataset_with_necessary_models(create_nodes=True,
                                         is_isatab_based=False, user=None,
                                         slug=None, latest_version=1):
    """Create Dataset with InvestigationLink, Investigation, Study and Assay"""
    dataset_uuid = str(uuid_lib.uuid4())
    dataset = DataSetFactory(uuid=dataset_uuid,
                             title="Test DataSet - {}".format(dataset_uuid),
                             name="Test DataSet - {}".format(dataset_uuid),
                             slug=slug)
    latest_study = _create_dataset_objects(dataset, is_isatab_based,
                                           latest_version)
    assay = AssayFactory(uuid=str(uuid_lib.uuid4()), study=latest_study)

    if create_nodes:
        for i in xrange(2):
            file_store_item = FileStoreItemFactory(
                uuid=str(uuid_lib.uuid4()),
                source='http://www.example.com/test{}.txt'.format(i)
            )
            node = NodeFactory(study=latest_study, assay=assay,
                               file=file_store_item, type=Node.RAW_DATA_FILE)
            attribute = AttributeFactory(node=node, type='Characteristics',
                                         subtype='organism', value='Human')
            AnnotatedNodeFactory(study=latest_study, assay=assay, node=node,
                                 node_name='AnnotatedNode-{}'.format(i),
                                 node_type=node.type, attribute=attribute)
    if user is not None:
        dataset.set_owner(user)
        dataset.save()

    return dataset


def _create_dataset_objects(dataset, is_isatab_based, latest_version):
    for i in xrange(1, latest_version+1):
        file_store_item_uuid = str(uuid_lib.uuid4())
        file_store_item = FileStoreItemFactory(
            uuid=file_store_item_uuid,
            source="http://www.example.com/test.{}".format(
                "zip" if is_isatab_based else "csv"
            )
        )
        investigation_uuid = str(uuid_lib.uuid4())
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

        study_uuid = str(uuid_lib.uuid4())
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
    name = "Test {} Tool: {}".format(tool_type, uuid_lib.uuid4())

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


def create_mock_hg_19_data_set(user=None):
    # Generally mocks the hg_19 local data set's study, assay, nodes,
    # annotated notes, and attributes.
    dataset = DataSetFactory(
        uuid=str(uuid_lib.uuid4()),
        title="Replica of hg-19 DataSet",
        name="Replica of hg-19 DataSet",
        slug=None
    )
    latest_study = _create_dataset_objects(dataset, False, 1)
    assay = AssayFactory(uuid=str(uuid_lib.uuid4()),
                         study=latest_study,
                         file_name='hg19-metadata-local.txt')

    node_names = ['s5_p42_E2_45min',
                  's7_EV_E2_45min',
                  's5_p42_E2_45min.subsample',
                  's7_EV_E2_45min.subsample']

    for name in node_names:
        source_name_node = NodeFactory(study=latest_study,
                                       assay=assay,
                                       file_uuid=None,
                                       type=Node.SOURCE,
                                       name=name)

        sample_name_node = NodeFactory(study=latest_study,
                                       assay=assay,
                                       file_uuid=None,
                                       type=Node.SAMPLE,
                                       name=name + '.fastq.gz')

        attribute_organism = AttributeFactory(node=sample_name_node,
                                              type="Characteristics",
                                              subtype="organism",
                                              value="Human")

        attribute_sample = AttributeFactory(node=sample_name_node,
                                            type="Characteristics",
                                            subtype="sample id",
                                            value=name)

        assay_name_node = NodeFactory(study=latest_study,
                                      assay=assay,
                                      file_uuid=None,
                                      type=Node.ASSAY,
                                      name=name + '.fastq.gz')

        file_store_item_uuid = str(uuid_lib.uuid4())
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

        _create_annotated_node(assay, attribute_organism, node, latest_study)
        _create_annotated_node(assay, attribute_sample, node, latest_study)

    if user is not None:
        dataset.set_owner(user)
        dataset.save()

    return dataset


def create_mock_isatab_9909_data_set(user=None):
    # Generally mocks the isatab 9909 data set's study, assay, nodes,
    # annotated notes, and attributes.
    dataset = DataSetFactory(
        accession='9909',
        uuid=str(uuid_lib.uuid4()),
        title='Comparison of muscle stem cell preplates and myoblasts.',
        name='9909: Comparison of muscle stem cell preplates and myoblasts.',
        slug=None
    )
    latest_study = _create_dataset_objects(dataset, True, 1)
    assay = AssayFactory(uuid=str(uuid_lib.uuid4()), study=latest_study,
                         file_name='isa_9909_558276.zip')

    qc_1_node = NodeFactory(study=latest_study,
                            assay=assay,
                            file_uuid=None,
                            type=Node.DATA_TRANSFORMATION,
                            name='QC_1')

    rma_node = NodeFactory(study=latest_study,
                           assay=assay,
                           file_uuid=None,
                           type=Node.DATA_TRANSFORMATION,
                           name='RMA')

    node_names = [{'source': 'myoblasts',
                   'sample': 'Human myoblasts, chip HG-U133A',
                   'scan': 'ks020802HU133A1a.CEL',
                   'culture': 'Primary culture',
                   'markers': 'Desmin;NKH1',
                   'notes': 'Primary culture of muscle derived cells'},
                  {'source': 'PP6 muscle stem cells',
                   'sample': 'PP6, chip HG-U133A',
                   'scan': 'ks020802HU133A2a.CEL',
                   'culture': 'Cultured for 24 hours, then multiple '
                              'preplates',
                   'markers': None,
                   'notes': None}]
    all_attributes = []
    for name in node_names:
        loop_attributes = []
        source_name_node = NodeFactory(study=latest_study,
                                       assay=assay,
                                       file_uuid=None,
                                       type=Node.SOURCE,
                                       name=name['source'])
        loop_attributes.append(AttributeFactory(
            node=source_name_node,
            type="Characteristics",
            subtype='organism part',
            value='Muscle',
            value_accession='http://test.site/fma#Muscle',
            value_source='FMA'
        ))
        loop_attributes.append(AttributeFactory(
            node=source_name_node,
            type="Characteristics",
            subtype='organism',
            value='Homo sapiens',
            value_accession='http://test.site/obo/NCBITaxon_9606',
            value_source='NCBITAXON'
        ))
        sample_name_node = NodeFactory(study=latest_study,
                                       assay=assay,
                                       file_uuid=None,
                                       type=Node.SAMPLE,
                                       name=name['sample'])
        loop_attributes.append(AttributeFactory(node=sample_name_node,
                                                type="Characteristics",
                                                subtype='cell type',
                                                value='Muscle stem cell'))
        loop_attributes.append(AttributeFactory(node=sample_name_node,
                                                type="Characteristics",
                                                subtype='notes',
                                                value=name['notes']))
        loop_attributes.append(AttributeFactory(node=sample_name_node,
                                                type="Characteristics",
                                                subtype='positive markers',
                                                value=name['markers']))
        loop_attributes.append(AttributeFactory(node=sample_name_node,
                                                type="Factor Value",
                                                subtype='culture medium',
                                                value=name['culture']))
        extract_name_node = NodeFactory(study=latest_study,
                                        assay=assay,
                                        file_uuid=None,
                                        type=Node.EXTRACT,
                                        name=name['sample'])
        loop_attributes.append(AttributeFactory(node=extract_name_node,
                                                type='Material Type',
                                                subtype=None,
                                                value='total RNA'))
        labeled_extract_name_node = NodeFactory(study=latest_study,
                                                assay=None,
                                                file_uuid=None,
                                                type=Node.LABELED_EXTRACT,
                                                name=name['sample'])
        loop_attributes.append(AttributeFactory(node=labeled_extract_name_node,
                                                type='Label',
                                                subtype=None,
                                                value='biotin'))
        hybrid_assay_name_node = NodeFactory(study=latest_study,
                                             assay=assay,
                                             file_uuid=None,
                                             type=Node.HYBRIDIZATION_ASSAY,
                                             name=name['sample'])

        file_store_item_uuid = str(uuid_lib.uuid4())
        FileStoreItemFactory(
            uuid=file_store_item_uuid,
            source='http://test.site/sites/bioassay_files/{}'.format(
                name['scan']
            )
        )
        array_data_node = NodeFactory(
            study=latest_study,
            assay=assay,
            file_uuid=file_store_item_uuid,
            type=Node.ARRAY_DATA_FILE,
            name='http://test.site/sites/bioassay_files/{}'.format(
                name['scan']
            )
        )

        for ind in range(4):
            scan_node = NodeFactory(study=latest_study,
                                    assay=assay,
                                    file_uuid=None,
                                    type=Node.SCAN,
                                    name=name['scan'])
            hybrid_assay_name_node.add_child(scan_node)
            scan_node.add_child(array_data_node)

        for attribute in loop_attributes:
            _create_annotated_node(assay, attribute, array_data_node,
                                   latest_study)

        source_name_node.add_child(sample_name_node)
        sample_name_node.add_child(extract_name_node)
        extract_name_node.add_child(labeled_extract_name_node)
        labeled_extract_name_node.add_child(hybrid_assay_name_node)
        array_data_node.add_child(qc_1_node)
        array_data_node.add_child(rma_node)
        all_attributes.extend(loop_attributes)
        loop_attributes = []  # reset attributes for next path

    file_store_uuid = str(uuid_lib.uuid4())
    FileStoreItemFactory(
        uuid=file_store_uuid,
        source='http://test.site/sites/9909/GPL96/raw_report_1/index.html'
    )
    qc_1_derived_node = NodeFactory(
        study=latest_study,
        assay=assay,
        file_uuid=file_store_uuid,
        type=Node.DERIVED_ARRAY_DATA_FILE,
        name='http://test.site/sites/9909/GPL96/raw_report_1/index.html'
    )
    qc_1_node.add_child(qc_1_derived_node)

    file_store_uuid = str(uuid_lib.uuid4())
    FileStoreItemFactory(
        uuid=file_store_uuid,
        source='http://test.site/sites/gct/9909_GPL96.gct'
    )
    rma_derived_node = NodeFactory(
        study=latest_study,
        assay=assay,
        file_uuid=file_store_item_uuid,
        type=Node.DERIVED_ARRAY_DATA_FILE,
        name='http://test.site/sites/gct/9909_GPL96.gct'
    )
    rma_node.add_child(rma_derived_node)
    qc_2_node = NodeFactory(study=latest_study,
                            assay=assay,
                            file_uuid=None,
                            type=Node.DATA_TRANSFORMATION,
                            name='QC_2')
    file_store_uuid = str(uuid_lib.uuid4())
    FileStoreItemFactory(
        uuid=file_store_uuid,
        source='http://test.site/sites/9909/GPL96/report_rma/index.html'
    )
    qc_2_derived_matrix = NodeFactory(
        study=latest_study,
        assay=assay,
        file_uuid=file_store_uuid,
        type=Node.DERIVED_ARRAY_DATA_MATRIX_FILE,
        name='http://test.site/sites/9909/GPL96/report_rma/index.html')

    rma_derived_node.add_child(qc_2_node)
    qc_2_node.add_child(qc_2_derived_matrix)

    pathprint_node = NodeFactory(study=latest_study,
                                 assay=assay,
                                 file_uuid=file_store_item_uuid,
                                 type=Node.DATA_TRANSFORMATION,
                                 name='pathprint')
    rma_derived_node.add_child(pathprint_node)
    file_store_uuid = str(uuid_lib.uuid4())
    FileStoreItemFactory(
        uuid=file_store_uuid,
        source='http://test.site/sites/9909.GPL96_pathprint.txt'
    )
    pathprint_derived_matrix_node = NodeFactory(
        study=latest_study,
        assay=assay,
        file_uuid=file_store_uuid,
        type=Node.DERIVED_ARRAY_DATA_MATRIX_FILE,
        name='http://test.site/sites/9909.GPL96_pathprint.txt'
    )
    pathprint_node.add_child(pathprint_derived_matrix_node)

    for attribute in all_attributes:
        _create_annotated_node(assay, attribute, qc_2_derived_matrix,
                               latest_study)
        _create_annotated_node(assay, attribute, qc_1_derived_node,
                               latest_study)
        _create_annotated_node(assay, attribute, rma_derived_node,
                               latest_study)
        _create_annotated_node(assay, attribute, pathprint_derived_matrix_node,
                               latest_study)

    node_names = ['pluriconsensus', 'geo']
    for name in node_names:
        path_print_node = NodeFactory(study=latest_study,
                                      assay=assay,
                                      file_uuid=None,
                                      type=Node.DATA_TRANSFORMATION,
                                      name='pathprint_{}'.format(name))
        record_attribute = AttributeFactory(node=path_print_node,
                                            type='Comment',
                                            subtype='Data Record Accession',
                                            value='')
        repository_attribute = AttributeFactory(node=path_print_node,
                                                type='Comment',
                                                subtype='Data Repository',
                                                value='')
        file_store_uuid = str(uuid_lib.uuid4())
        FileStoreItemFactory(
            uuid=file_store_uuid,
            source='http://test.site/sites/9909.GPL96_{}.pdf'.format(name)
        )
        final_node = NodeFactory(
            study=latest_study,
            assay=assay,
            file_uuid=file_store_uuid,
            type=Node.DERIVED_ARRAY_DATA_MATRIX_FILE,
            name='http://test.site/sites/9909.GPL96_{}.pdf'.format(name)
        )
        for attribute in all_attributes:
            _create_annotated_node(assay, attribute, final_node, latest_study)

        _create_annotated_node(assay, record_attribute, final_node,
                               latest_study)
        _create_annotated_node(assay, repository_attribute, final_node,
                               latest_study)

        pathprint_derived_matrix_node.add_child(path_print_node)
        path_print_node.add_child(final_node)

    if user is not None:
        dataset.set_owner(user)
        dataset.save()

    return dataset


def _create_annotated_node(assay, attribute, node, study):
    AnnotatedNodeFactory(assay=assay,
                         attribute=attribute,
                         attribute_type=attribute.type,
                         attribute_subtype=attribute.subtype,
                         attribute_value=attribute.value,
                         node=node,
                         node_file_uuid=node.file_uuid,
                         node_name=node.name,
                         node_type=node.type,
                         node_uuid=node.uuid,
                         study=study)
