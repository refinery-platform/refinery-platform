import logging

from django.http import HttpResponseServerError

from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import GenericViewSet, ModelViewSet

from .models import (ToolDefinition,
                     VisualizationToolLaunch)
from .serializers import ToolDefinitionSerializer

logger = logging.getLogger(__name__)


class ToolDefinitionsViewSet(ModelViewSet):
    """API endpoint that allows for ToolDefinitions to be fetched"""

    queryset = ToolDefinition.objects.all()
    serializer_class = ToolDefinitionSerializer
    lookup_field = 'uuid'
    http_method_names = ['get']
    permission_classes = [IsAuthenticated]


class ToolLaunchViewSet(GenericViewSet):
    """API endpoint that allows for Tools to be launched"""
    http_method_names = ['post']
    permission_classes = [IsAuthenticated]

    def launch(self, request, *args, **kwargs):
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
                # get_urls_from_node_uuids()

                visualization_tool = VisualizationToolLaunch.objects.create(
                    tool_definition=tool_definition,
                    parameters=tool_launch_data["parameters"],
                    file_relationships=tool_launch_data["file_relationships"]
                )

                visualization_tool.set_owner(request.user)
                visualization_tool.save()

                return visualization_tool.launch()
            elif tool_definition.tool_type == ToolDefinition.WORKFLOW:
                pass
