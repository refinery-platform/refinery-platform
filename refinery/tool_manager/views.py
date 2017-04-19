import logging

from django.db import transaction
from django.http import HttpResponseServerError

from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from factory_boy.django_model_factories import ToolFactory
from .models import Tool, ToolDefinition
from .serializers import ToolDefinitionSerializer, ToolSerializer

logger = logging.getLogger(__name__)


class ToolDefinitionsViewSet(ModelViewSet):
    """API endpoint that allows for ToolDefinitions to be fetched"""

    queryset = ToolDefinition.objects.all()
    serializer_class = ToolDefinitionSerializer
    lookup_field = 'uuid'
    http_method_names = ['get']
    permission_classes = [IsAuthenticated]


class ToolViewSet(ModelViewSet):
    """API endpoint that allows for Tools to be fetched and launched"""

    queryset = Tool.objects.all()
    serializer_class = ToolSerializer
    lookup_field = 'uuid'
    http_method_names = ['get', 'post']
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        # TODO: Validate incoming Tool Launch Configurations against our schema
        # try:
        #     validate_tool_launch_configuration(request.data)
        # except RuntimeError as e:
        #     return HttpResponseServerError(e)
        # else:
        #     tool_launch_data = request.data

        tool_launch_data = request.data

        try:
            tool_definition = ToolDefinition.objects.get(
                uuid=tool_launch_data["tool_definition_uuid"]
            )
        except(
                ToolDefinition.DoesNotExist,
                ToolDefinition.MultipleObjectsReturned
        ) as e:
            return HttpResponseServerError(
                "Couldn't fetch ToolDefinition with UUID {}: {}".format(
                    tool_launch_data["tool_definition_uuid"],
                    e
                )
            )
        else:
            if tool_definition.tool_type == ToolDefinition.VISUALIZATION:
                # TODO: Talk to Node API and get urls from node UUIDs in the
                # `file_relationships` data structure
                # Tool.parse_file_relationships_string()
                # Tool.populate_url_from_node_uuid()

                visualization_tool = ToolFactory(
                    name="{}-launch".format(tool_definition.name),
                    tool_definition=tool_definition,
                    parameters=tool_launch_data["parameters"],
                    file_relationships=tool_launch_data["file_relationships"]
                )

                # Create a unique container name that adheres to dockers
                # specifications
                visualization_tool.container_name = "{}-{}".format(
                    visualization_tool.name.replace(" ", ""),
                    visualization_tool.uuid
                )

                visualization_tool.set_owner(request.user)
                visualization_tool.save()

                return visualization_tool.launch()

            elif tool_definition.tool_type == ToolDefinition.WORKFLOW:
                pass
