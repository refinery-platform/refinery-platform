from datetime import datetime
import uuid as uuid_builtin

from core.models import Analysis, DataSet, Node
from factory_boy.django_model_factories import (AnalysisFactory,
                                                AnnotatedNodeFactory,
                                                AssayFactory, DataSetFactory,
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
    dataset = create_dataset_with_necessary_models()

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

    for dataset in DataSet.objects.all():
        dataset.set_owner(user_instance)
        dataset.save()

    for analysis in Analysis.objects.all():
        analysis.set_owner(user_instance)
        analysis.save()


def create_dataset_with_necessary_models():
    """Create Dataset with InvestigationLink, Investigation, Study,
    and Assay"""
    dataset_uuid = str(uuid_builtin.uuid4())
    dataset = DataSetFactory(
        uuid=dataset_uuid,
        title="Test DataSet - {}".format(dataset_uuid),
        name="Test DataSet - {}".format(dataset_uuid)
    )

    investigation_uuid = str(uuid_builtin.uuid4())
    investigation = InvestigationFactory(uuid=investigation_uuid)

    InvestigationLinkFactory(
        data_set=dataset,
        investigation=investigation,
        version=1,
        date=datetime.now()
    )

    study_uuid = str(uuid_builtin.uuid4())
    study = StudyFactory(
        uuid=study_uuid,
        investigation=investigation,
        description="This is a great DataSet"
    )

    for i in xrange(2):
        assay_uuid = str(uuid_builtin.uuid4())
        assay = AssayFactory(
            uuid=assay_uuid,
            study=study
        )
        node = NodeFactory(
            study=study
        )
        AnnotatedNodeFactory(
            study=study,
            assay=assay,
            node=node,
            node_name='AnnotatedNode-{}'.format(i),
            node_type=Node.RAW_DATA_FILE)

    return dataset
