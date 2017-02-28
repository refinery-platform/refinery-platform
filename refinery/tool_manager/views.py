from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from .models import ToolDefinition
from .serializers import ToolDefinitionSerializer


class ToolDefinitionsViewSet(ModelViewSet):
    """API endpoint that allows for ToolDefinitions to be fetched"""

    queryset = ToolDefinition.objects.all()
    serializer_class = ToolDefinitionSerializer
    lookup_field = 'uuid'
    http_method_names = ['get']
    permission_classes = [IsAuthenticated]
