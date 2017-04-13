import logging

from django.http import HttpResponseServerError

from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet, GenericViewSet

from .models import (ToolDefinition,
                     VisualizationToolLaunch)
from .serializers import (ToolDefinitionSerializer)

logger = logging.getLogger(__name__)


class ToolDefinitionsViewSet(ModelViewSet):
    """API endpoint that allows for ToolDefinitions to be fetched"""

    queryset = ToolDefinition.objects.all()
    serializer_class = ToolDefinitionSerializer
    lookup_field = 'uuid'
    http_method_names = ['get']
    permission_classes = [IsAuthenticated]


class ToolLaunchConfigurationViewSet(GenericViewSet):
    """API endpoint that allows for Tools to be launched"""
    http_method_names = ['post']
    permission_classes = [IsAuthenticated]

    def launch(self, request, *args, **kwargs):
        # try:
        #     validate_tool_launch_configuration(request.data)
        # except RuntimeError as e:
        #     return HttpResponseServerError(e)

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
                    tool_launch_data["uuid"],
                    e
                )
            )
        else:
            if tool_definition.tool_type == ToolDefinition.VISUALIZATION:
                visualization_tool = VisualizationToolLaunch.objects.create(
                    tool_definition=tool_definition,
                    parameters=tool_launch_data[
                        "parameters"
                    ],
                    file_relationships=tool_launch_data[
                       "file_relationships"
                    ]

                )
                return visualization_tool.launch()
            elif tool_definition.tool_type == ToolDefinition.WORKFLOW:
                pass
