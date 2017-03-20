from datetime import datetime
import uuid as uuid_builtin

from core.models import Analysis, DataSet

from factory_boy.django_model_factories import (
    AnalysisFactory, DataSetFactory, GalaxyInstanceFactory,
    InvestigationFactory, InvestigationLinkFactory, ProjectFactory,
    StudyFactory, WorkflowEngineFactory, WorkflowFactory
)


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
