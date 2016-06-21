from rest_framework import serializers

from .models import Workflow, NodeGroup
from data_set_manager.serializers import AssaySerializer, StudySerializer


class NodeGroupSerializer(serializers.ModelSerializer):
    """Read_only: included in the API output, but not be included in during
    create/update. True so we can pass list, otherwise we'd get pk validation
    error, 'expect pk got list' """
    nodes = serializers.PrimaryKeyRelatedField(many=True,
                                               read_only=True,
                                               required=False)
    assay = AssaySerializer(source='assay')
    assay = StudySerializer(source='study')

    class Meta:
        model = NodeGroup
        fields = ('id', 'uuid', 'node_count', 'is_implicit', 'study',
                  'assay', 'is_current', 'nodes', 'name')

    def create(self, validated_data):
        node_group = NodeGroup.objects.create(
            study=validated_data.get('study'),
            assay=validated_data.get('assay'),
            name=validated_data.get('name'),
            is_current=validated_data.get('is_current')
        )
        """Work-around to pass nodes pk list to serializer. Had to add nodes
        after group creation. List does not show up in validate_data due to
        read_only attribute."""
        if self.initial_data.get('nodes'):
            node_group.nodes.add(*self.initial_data.get('nodes'))
            node_group.node_count = len(self.initial_data.get('nodes'))
            node_group.save()

        return node_group

    def update(self, instance, validated_data):
        """
        Update and return an existing `NodeGroup` instance, given the
        validated data.
        """
        if self.initial_data.get('nodes'):
            instance.nodes = self.initial_data.get('nodes', instance.nodes)
            instance.node_count = len(self.initial_data.get('nodes'))

        instance.is_current = validated_data.get('is_current',
                                                 instance.is_current)
        instance.save()
        return instance


class WorkflowSerializer(serializers.HyperlinkedModelSerializer):
    instance = serializers.HyperlinkedIdentityField(
        view_name='workflow-detail')
    workflow_engine = serializers.StringRelatedField()
    data_inputs = serializers.StringRelatedField()
    input_relationships = serializers.StringRelatedField()

    class Meta:
        model = Workflow
