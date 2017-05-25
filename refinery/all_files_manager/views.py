import logging

from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

# from .models import AllFiles
from .serializers import AllFilesSerializer

logger = logging.getLogger(__name__)


class AllFilesViewSet(ModelViewSet):
    """API endpoint that allows for all files to be listed"""

    def list(self, request):
        queryset = 'TODO: From solr?'
        serializer = AllFilesSerializer(queryset, many=True)
        return Response(serializer.data)
