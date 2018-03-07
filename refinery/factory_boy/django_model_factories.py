from datetime import datetime
import uuid as uuid_builtin

import factory

from data_set_manager.models import Node


class DataSetFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a DataSet"""
    class Meta:
        model = "core.DataSet"

    uuid = uuid_builtin.uuid4()
    title = "Test DataSet - {}".format(uuid)
    name = "Test DataSet - {}".format(uuid)
    creation_date = datetime.now()
    modification_date = datetime.now()


class AssayFactory(factory.django.DjangoModelFactory):
    """Minimal representation of an Assay"""
    class Meta:
        model = "data_set_manager.Assay"

    uuid = uuid_builtin.uuid4()


class StudyFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a Study"""
    class Meta:
        model = "data_set_manager.Study"

    uuid = uuid_builtin.uuid4()


class InvestigationLinkFactory(factory.django.DjangoModelFactory):
    """Minimal representation of an InvestigationLink"""
    class Meta:
        model = "core.InvestigationLink"

    version = 1
    date = datetime.now()


class NodeFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a Node"""
    class Meta:
        model = "data_set_manager.Node"

    type = Node.RAW_DATA_FILE


class AnnotatedNodeFactory(factory.django.DjangoModelFactory):
    """Minimal representation of an AnnotatedNode"""
    class Meta:
        model = "data_set_manager.AnnotatedNode"


class AttributeFactory(factory.django.DjangoModelFactory):
    """Minimal representation of an Attribute"""
    class Meta:
        model = "data_set_manager.Attribute"


class AnalysisFactory(factory.django.DjangoModelFactory):
    """Minimal representation of an Analysis"""
    class Meta:
        model = "core.Analysis"
        django_get_or_create = ('uuid',)

    uuid = uuid_builtin.uuid4()
    name = "Test Analysis - {}".format(uuid)
    summary = "Summary for {}".format(name)
    creation_date = datetime.now()
    modification_date = datetime.now()


class ProjectFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a Project"""
    class Meta:
        model = "core.Project"


class GalaxyInstanceFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a GalaxyInstance"""
    class Meta:
        model = "galaxy_connector.Instance"
    base_url = "http://www.example.com/galaxy"


class WorkflowEngineFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a WorkflowEngine"""
    class Meta:
        model = "core.WorkflowEngine"


class WorkflowFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a Workflow"""
    class Meta:
        model = "core.Workflow"

    uuid = uuid_builtin.uuid4()
    name = "Test Workflow - {}".format(uuid)


class NodeCollectionFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a NodeCollection"""
    class Meta:
        model = "data_set_manager.NodeCollection"
    uuid = uuid_builtin.uuid4()


class InvestigationFactory(NodeCollectionFactory):
    """Minimal representation of a Investigation"""
    class Meta:
        model = "data_set_manager.Investigation"


class ToolDefinitionFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a ToolDefinition"""
    class Meta:
        model = "tool_manager.ToolDefinition"


class ToolFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a Tool"""
    class Meta:
        model = "tool_manager.Tool"


class VisualizationToolFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a VisualizationTool"""
    class Meta:
        model = "tool_manager.VisualizationTool"


class WorkflowToolFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a WorkflowTool"""
    class Meta:
        model = "tool_manager.WorkflowTool"


class FileRelationshipFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a FileRelationship"""
    class Meta:
        model = "tool_manager.FileRelationship"


class InputFileFactory(factory.django.DjangoModelFactory):
    """Minimal representation of an InputFile"""
    class Meta:
        model = "tool_manager.InputFile"


class ParameterFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a Parameter"""
    class Meta:
        model = "tool_manager.Parameter"


class GalaxyParameterFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a GalaxyParameter"""
    class Meta:
        model = "tool_manager.GalaxyParameter"


class FileTypeFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a FileType"""
    class Meta:
        model = "file_store.FileType"


class FileExtensionFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a FileExtension"""
    class Meta:
        model = "file_store.FileExtension"


class FileStoreItemFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a FileStoreItem"""

    class Meta:
        model = "file_store.FileStoreItem"


class AnalysisNodeConnectionFactory(factory.django.DjangoModelFactory):
    """Minimal representation of an AnalysisNodeConnection"""

    class Meta:
        model = "core.AnalysisNodeConnection"


class AnalysisResultFactory(factory.django.DjangoModelFactory):
    """Minimal representation of an AnalysisResult"""

    class Meta:
        model = "core.AnalysisResult"


class AnalysisStatusFactory(factory.django.DjangoModelFactory):
    """Minimal representation of an AnalysisStatus"""

    class Meta:
        model = "analysis_manager.AnalysisStatus"
