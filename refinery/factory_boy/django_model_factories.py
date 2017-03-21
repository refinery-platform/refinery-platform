from datetime import datetime
import uuid as uuid_builtin

import factory


class DataSetFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a DataSet for testing purposes"""
    class Meta:
        model = "core.DataSet"

    uuid = uuid_builtin.uuid4()
    title = "Test DataSet - {}".format(uuid)
    name = "Test DataSet - {}".format(uuid)
    creation_date = datetime.now()
    modification_date = datetime.now()


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


class GalaxyInstanceFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a GalaxyInstance for testing purposes"""
    class Meta:
        model = "galaxy_connector.Instance"


class WorkflowEngineFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a WorkflowEngine for testing purposes"""
    class Meta:
        model = "core.WorkflowEngine"


class WorkflowFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a Workflow for testing purposes"""
    class Meta:
        model = "core.Workflow"

    uuid = uuid_builtin.uuid4()
    name = "Test Workflow - {}".format(uuid)


class NodeCollectionFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a NodeCollection for testing purposes"""
    class Meta:
        model = "data_set_manager.NodeCollection"
    uuid = uuid_builtin.uuid4()


class InvestigationFactory(NodeCollectionFactory):
    """Minimal representation of a Investigation for testing purposes"""
    class Meta:
        model = "data_set_manager.Investigation"


class ToolDefinitionFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a ToolDefinition for testing purposes"""

    class Meta:
        model = "tool_manager.ToolDefinition"


class FileRelationshipFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a FileRelationship for testing purposes"""

    class Meta:
        model = "tool_manager.FileRelationship"


class InputFileFactory(factory.django.DjangoModelFactory):
    """Minimal representation of an InputFile for testing purposes"""

    class Meta:
        model = "tool_manager.InputFile"


class ParameterFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a Parameter for testing purposes"""

    class Meta:
        model = "tool_manager.Parameter"


class GalaxyParameterFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a GalaxyParameter for testing purposes"""

    class Meta:
        model = "tool_manager.GalaxyParameter"


class OutputFileFactory(factory.django.DjangoModelFactory):
    """Minimal representation of an OutputFile for testing purposes"""

    class Meta:
        model = "tool_manager.OutputFile"


class FileTypeFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a FileType for testing purposes"""

    class Meta:
        model = "file_store.FileType"


class FileExtensionFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a FileExtension for testing purposes"""

    class Meta:
        model = "file_store.FileExtension"
