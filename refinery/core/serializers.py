from rest_framework import serializers

from .models import Workflow, NodeGroup


class NodeGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = NodeGroup
        fields = ('id', 'uuid', 'node_count', 'is_implicit', 'study',
                  'assay', 'is_current', 'nodes_uuids', 'name')

        def create(self, validated_data):
            node_group = NodeGroup.objects.create(
                study=validated_data.get('study'),
                assay=validated_data.get('assay'),
                name=validated_data.get('name')
            )
            if validated_data.get('node_count'):
                node_group.node_count = validated_data.get('node_count')
                node_group.save()
            if validated_data.get('nodes_uuids'):
                node_group.nodes_uuids = validated_data.get('nodes_uuids')
                node_group.save()
            return node_group

        def update(self, instance, validated_data):
            """
            Update and return an existing `NodeGroup` instance, given the
            validated data.
            """
            instance.node_count = validated_data.get('node_count',
                                                     instance.node_count)
            instance.nodes_uuids = validated_data.get('nodes_uuids',
                                                      instance.nodes_uuids)
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
