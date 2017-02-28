from rest_framework.viewsets import ModelViewSet

from .serializers import ToolDefinitionSerializer
from .models import ToolDefinition


class ToolDefinitionsViewSet(ModelViewSet):
    """API endpoint that allows for ToolDefinitions to be fetched"""

    queryset = ToolDefinition.objects.all()
    serializer_class = ToolDefinitionSerializer
    lookup_field = 'uuid'
    http_method_names = ['get']
