import os
import sys
import uuid as uid
from datetime import datetime

import factory

sys.path.append("../refinery/")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

from core.models import DataSet, Analysis


class DataSetFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a DataSet for testing purposes"""
    class Meta:
        model = "core.DataSet"
        django_get_or_create = ('uuid',)

    uuid = uid.uuid4()
    title = "Test DataSet - {}".format(uuid)
    name = "Test DataSet - {}".format(uuid)
    creation_date = datetime.now()
    modification_date = datetime.now()


class InvestigationFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a Investigation for testing purposes"""
    class Meta:
        model = "data_set_manager.Investigation"

    uuid = uid.uuid4()


class StudyFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a Study for testing purposes"""
    class Meta:
        model = "data_set_manager.Study"

    uuid = uid.uuid4()


class InvestigationLinkFactory(factory.django.DjangoModelFactory):
    """Minimal representation of an InvestigationLink for testing purposes"""
    class Meta:
        model = "core.InvestigationLink"

    version = 1
    date = datetime.now()


class AnalysisFactory(factory.django.DjangoModelFactory):
    """Minimal representation of an Analysis for testing purposes"""
    class Meta:
        model = "core.Analysis"

    uuid = uid.uuid4()
    name = "Test Analysis - {}".format(uuid)
    summary = "Summary for {}".format(name)
    creation_date = datetime.now()
    modification_date = datetime.now()


class ProjectFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a Project for testing purposes"""
    class Meta:
        model = "core.Project"


class GalaxyInstanceFactory(factory.DjangoModelFactory):
    """Minimal representation of a GalaxyInstance for testing purposes"""
    class Meta:
        model = "galaxy_connector.Instance"


class WorkflowEngineFactory(factory.DjangoModelFactory):
    """Minimal representation of a WorkflowEngine for testing purposes"""
    class Meta:
        model = "core.WorkflowEngine"


class WorkflowFactory(factory.DjangoModelFactory):
    """Minimal representation of a Workflow for testing purposes"""
    class Meta:
        model = "core.Workflow"

    uuid = uid.uuid4()
    name = "Test Workflow - {}".format(uuid)


def make_datasets(number_to_create, user_instance):
    """Create some minimal DataSets"""
    while number_to_create >= 1:

        dataset_uuid = uid.uuid4()
        dataset = DataSetFactory(
                uuid=dataset_uuid,
                title="Test DataSet - {}".format(dataset_uuid),
                name="Test DataSet - {}".format(dataset_uuid)
            )

        investigation_uuid = uid.uuid4()
        investigation = InvestigationFactory(uuid=investigation_uuid)

        study_uuid = uid.uuid4()
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
    workflow = WorkflowFactory(workflow_engine=workflow_engine)
    project = ProjectFactory(is_catch_all=True)

    dataset_uuid = uid.uuid4()
    dataset = DataSetFactory(
            uuid=dataset_uuid,
            title="Test DataSet - {}".format(dataset_uuid),
            name="Test DataSet - {}".format(dataset_uuid)
        )

    investigation_uuid = uid.uuid4()
    investigation = InvestigationFactory(uuid=investigation_uuid)

    study_uuid = uid.uuid4()
    study = StudyFactory(uuid=study_uuid, investigation=investigation)

    InvestigationLinkFactory(
        data_set=dataset,
        investigation=study.investigation,
        version=1,
        date=datetime.now()
    )

    while number_to_create >= 1:
        analysis_uuid = uid.uuid4()
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
