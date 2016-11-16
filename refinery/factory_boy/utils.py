import uuid as uuid_builtin
from datetime import datetime

from django.contrib.auth.models import User

from core.models import DataSet, Analysis

from factory_boy.django_model_factories import DataSetFactory, \
    InvestigationFactory, StudyFactory, InvestigationLinkFactory, \
    GalaxyInstanceFactory, WorkflowEngineFactory, WorkflowFactory, \
    ProjectFactory, AnalysisFactory


def make_datasets(number_to_create, user_instance):
    """Create some minimal DataSets"""
    while number_to_create >= 1:
        dataset_uuid = uuid_builtin.uuid4()
        dataset = DataSetFactory(
            uuid=dataset_uuid,
            title="Test DataSet - {}".format(dataset_uuid),
            name="Test DataSet - {}".format(dataset_uuid)
        )

        investigation_uuid = uuid_builtin.uuid4()
        investigation = InvestigationFactory(uuid=investigation_uuid)

        study_uuid = uuid_builtin.uuid4()
        study = StudyFactory(uuid=study_uuid, investigation=investigation)

        InvestigationLinkFactory(
            data_set=dataset,
            investigation=study.investigation,
            version=1,
            date=datetime.now()
        )

        number_to_create -= 1

    for dataset in DataSet.objects.all():
        dataset.set_owner(user_instance)
        dataset.save()


def make_analyses_with_single_dataset(number_to_create, user_instance):
    """Create some minimal Analyses"""
    instance = GalaxyInstanceFactory()
    workflow_engine = WorkflowEngineFactory(instance=instance)
    workflow_uuid = uuid_builtin.uuid4()
    workflow = WorkflowFactory(uuid=workflow_uuid,
                               workflow_engine=workflow_engine)
    project = ProjectFactory(is_catch_all=True)

    dataset_uuid = uuid_builtin.uuid4()
    dataset = DataSetFactory(
        uuid=dataset_uuid,
        title="Test DataSet - {}".format(dataset_uuid),
        name="Test DataSet - {}".format(dataset_uuid)
    )

    investigation_uuid = uuid_builtin.uuid4()
    investigation = InvestigationFactory(uuid=investigation_uuid)

    study_uuid = uuid_builtin.uuid4()
    study = StudyFactory(uuid=study_uuid, investigation=investigation)

    InvestigationLinkFactory(
        data_set=dataset,
        investigation=study.investigation,
        version=1,
        date=datetime.now()
    )

    while number_to_create >= 1:
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


def factory_boy_cleanup():
    # Will take care of Analysis deletion as well
    DataSet.objects.filter(name__startswith="Test DataSet -").delete()
    User.objects.filter(first_name="Test User").delete()
