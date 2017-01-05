import uuid as uuid_builtin
from datetime import datetime

import django
import factory

# Call to django.setup() needed due to the new handling of the AppRegistry in
# Django 1.7
django.setup()

# Call to django.setup() needed due to the new handling of the AppRegistry in
# Django 1.7
django.setup()


class DataSetFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a DataSet for testing purposes"""

    class Meta:
        model = "core.DataSet"
        django_get_or_create = ('uuid',)

    uuid = uuid_builtin.uuid4()
    title = "Test DataSet - {}".format(uuid)
    name = "Test DataSet - {}".format(uuid)
    creation_date = datetime.now()
    modification_date = datetime.now()


class InvestigationFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a Investigation for testing purposes"""

    class Meta:
        model = "data_set_manager.Investigation"

    uuid = uuid_builtin.uuid4()


class StudyFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a Study for testing purposes"""

    class Meta:
        model = "data_set_manager.Study"

    uuid = uuid_builtin.uuid4()


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
        django_get_or_create = ('uuid',)

    uuid = uuid_builtin.uuid4()
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
        django_get_or_create = ('uuid',)

    uuid = uuid_builtin.uuid4()
    name = "Test Workflow - {}".format(uuid)
