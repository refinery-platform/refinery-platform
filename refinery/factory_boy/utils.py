import uuid as uuid_builtin

from core.models import Analysis, DataSet
from factory_boy.django_model_factories import (AnalysisFactory,
                                                AnnotatedNodeFactory,
                                                AssayFactory, AttributeFactory,
                                                DataSetFactory,
                                                FileStoreItemFactory,
                                                GalaxyInstanceFactory,
                                                InvestigationFactory,
                                                InvestigationLinkFactory,
                                                NodeFactory, ProjectFactory,
                                                StudyFactory,
                                                WorkflowEngineFactory,
                                                WorkflowFactory)


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
    workflow = WorkflowFactory(uuid=str(uuid_builtin.uuid4()),
                               workflow_engine=workflow_engine)
    project = ProjectFactory(is_catch_all=True)
    dataset = create_dataset_with_necessary_models(user=user_instance)

    while number_to_create:
        analysis_uuid = str(uuid_builtin.uuid4())
        AnalysisFactory(
            uuid=analysis_uuid,
            name="Test Analysis - {}".format(analysis_uuid),
            project=project,
            data_set=dataset,
            workflow=workflow
        )

        number_to_create -= 1

    analyses = Analysis.objects.all()
    for analysis in Analysis.objects.all():
        analysis.set_owner(user_instance)
        analysis.save()

    return analyses, dataset


def create_dataset_with_necessary_models(
        create_nodes=True, is_isatab_based=False, user=None, slug=None
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

    file_store_item = FileStoreItemFactory(
        uuid=str(uuid_builtin.uuid4()),
        source="http://www.example.com/test.{}".format(
            "zip" if is_isatab_based else "csv"
        )
    )

    investigation_uuid = str(uuid_builtin.uuid4())
    investigation = InvestigationFactory(
        uuid=investigation_uuid,
        isarchive_file=file_store_item.uuid if is_isatab_based else None,
        pre_isarchive_file=None if is_isatab_based else file_store_item.uuid
    )

    study_uuid = str(uuid_builtin.uuid4())
    study = StudyFactory(
        uuid=study_uuid,
        investigation=investigation,
        description="This is a great DataSet"
    )

    InvestigationLinkFactory(
        data_set=dataset,
        investigation=investigation,
        version=1
    )

    NodeFactory(
        study=study,
        file_uuid=file_store_item.uuid
    )

    assay_uuid = str(uuid_builtin.uuid4())
    assay = AssayFactory(
        uuid=assay_uuid,
        study=study
    )

    if create_nodes:
        for i in xrange(2):
            file_store_item_uuid = str(uuid_builtin.uuid4())
            file_store_item = FileStoreItemFactory(
                uuid=file_store_item_uuid,
                source="http://www.example.com/test{}.txt".format(i)
            )
            node = NodeFactory(
                study=study,
                file_uuid=file_store_item.uuid
            )
            attribute = AttributeFactory(
                node=node
            )
            AnnotatedNodeFactory(
                study=study,
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
