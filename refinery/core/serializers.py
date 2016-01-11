from core.models import Workflow
from rest_framework import serializers


class WorkflowSerializer(serializers.HyperlinkedModelSerializer):

    class Meta:
        model = Workflow
