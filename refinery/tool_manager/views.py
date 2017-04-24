import logging

from django.http import HttpResponseServerError

from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from tool_manager.utils import create_tool, validate_tool_launch_configuration
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


class ToolsViewSet(ModelViewSet):
    """API endpoint that allows for Tools to be fetched and launched"""

    queryset = Tool.objects.all()
    serializer_class = ToolSerializer
    lookup_field = 'uuid'
    http_method_names = ['get', 'post']
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        try:
            validate_tool_launch_configuration(request.data)
        except RuntimeError as e:
            return HttpResponseServerError(e)
        else:
            tool_launch_configuration = request.data
            try:
                tool = create_tool(tool_launch_configuration, request.user)
            except Exception as e:
                return HttpResponseServerError(e)

        if tool.get_tool_type() == ToolDefinition.VISUALIZATION:
            return tool.launch()

        elif tool.get_tool_type() == ToolDefinition.WORKFLOW:
            raise NotImplementedError
