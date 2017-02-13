import logging

import celery
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import DataSet, NodeGroup, Workflow
from data_set_manager.models import Assay, Node, Study
from file_store.models import FileStoreItem


logger = logging.getLogger(__name__)


class DataSetSerializer(serializers.ModelSerializer):
    slug = serializers.CharField(
            max_length=250,
            trim_whitespace=True,
            validators=[UniqueValidator(
                queryset=DataSet.objects.all(),
                message='Slugs must be unique.'
            )]
    )
    description = serializers.CharField(max_length=5000)

    class Meta:
        model = DataSet
        fields = ['title', 'accession', 'summary', 'description', 'slug']

    def partial_update(self, instance, validated_data):
        """
        Update and return an existing `DataSet` instance, given the
        validated data.
        """
        instance.title = validated_data.get('title', instance.title)
        instance.accession = validated_data.get(
            'accession', instance.accession
        )
        instance.summary = validated_data.get('summary', instance.summary)
        instance.description = validated_data.get(
            'description', instance.description
        )
        instance.slug = validated_data.get('slug', instance.slug)

        instance.save()
        return instance


class NodeGroupSerializer(serializers.ModelSerializer):
    # Slug related field associated uuids with model
    nodes = serializers.SlugRelatedField(
        many=True, slug_field='uuid',
        queryset=Node.objects.all(),
        required=False, allow_null=True)
    assay = serializers.SlugRelatedField(
        queryset=Assay.objects.all(),
        slug_field='uuid')
    study = serializers.SlugRelatedField(
        queryset=Study.objects.all(),
        slug_field='uuid')

    class Meta:
        model = NodeGroup
        fields = ('uuid', 'node_count', 'is_implicit', 'study',
                  'assay', 'is_current', 'nodes', 'name')

    def create(self, validated_data):
        node_group = NodeGroup.objects.create(
            study=validated_data.get('study'),
            assay=validated_data.get('assay'),
            name=validated_data.get('name'),
            is_current=validated_data.get('is_current', False),
        )
        # Add foreign keys after object is created
        if validated_data.get('nodes'):
            node_group.nodes.add(*validated_data.get('nodes'))
            node_group.node_count = len(validated_data.get('nodes'))
            node_group.save()

        return node_group

    def update(self, instance, validated_data):
        """
        Update and return an existing `NodeGroup` instance, given the
        validated data.
        """
        if validated_data.get('nodes'):
            instance.nodes = validated_data.get('nodes', instance.nodes)
            instance.node_count = len(validated_data.get('nodes'))

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


class NodeSerializer(serializers.HyperlinkedModelSerializer):
    assay = serializers.StringRelatedField()
    study = serializers.StringRelatedField()
    child_nodes = serializers.SerializerMethodField('_get_children')
    parent_nodes = serializers.SerializerMethodField('_get_parents')
    auxiliary_nodes = serializers.SerializerMethodField('_get_aux_nodes')
    auxiliary_file_generation_task_state = serializers.SerializerMethodField(
                '_get_aux_node_task_state'
            )
    file_extension = serializers.SerializerMethodField(
        '_get_file_extension')
    relative_file_store_item_url = serializers.SerializerMethodField(
        '_get_relative_url')
    ready_for_igv_detail_view = serializers.SerializerMethodField(
     '_ready_for_igv_detail_view')
    is_auxiliary_node = serializers.SerializerMethodField(
     '_is_auxiliary_node')

    def _get_children(self, obj):
        return obj.get_children()

    def _get_parents(self, obj):
        return obj.get_parents()

    def _get_aux_nodes(self, obj):
        aux_nodes = obj.get_auxiliary_nodes()
        urls = []
        for uuid in aux_nodes:
            try:
                node = Node.objects.get(uuid=uuid)
                urls.append(node.get_relative_file_store_item_url())
            except (Node.DoesNotExist,
                    Node.MultipleObjectsReturned) as e:
                logger.debug(e)
        return urls

    def _get_aux_node_task_state(self, obj):
        return obj.get_auxiliary_file_generation_task_state()

    def _get_file_extension(self, obj):
        try:
            return FileStoreItem.objects.get(
                    uuid=obj.file_uuid).get_file_extension()
        except (FileStoreItem.DoesNotExist,
                FileStoreItem.MultipleObjectsReturned) as e:
            logger.debug(e)
            return None

    def _get_relative_url(self, obj):
        return obj.get_relative_file_store_item_url() or None

    def _ready_for_igv_detail_view(self, obj):
        if not obj.is_auxiliary_node:
            ready_for_igv_detail_view = True
            for item in obj.get_auxiliary_nodes():
                try:
                    node = Node.objects.get(uuid=item)
                except (Node.DoesNotExist,
                        Node.MultipleObjectsReturned) \
                        as e:
                    logger.error(e)
                    return False

                state = node.get_auxiliary_file_generation_task_state()
                if not state == celery.states.SUCCESS:
                    ready_for_igv_detail_view = False

            return ready_for_igv_detail_view
        else:
            return None

    def _is_auxiliary_node(self, obj):
        return obj.is_auxiliary_node

    class Meta:
        model = Node
        fields = [
            'uuid',
            'name',
            'type',
            'analysis_uuid',
            'subanalysis',
            'assay',
            'study',
            'relative_file_store_item_url',
            'parent_nodes',
            'child_nodes',
            'auxiliary_nodes',
            'is_auxiliary_node',
            'file_extension',
            'auxiliary_file_generation_task_state',
            'ready_for_igv_detail_view',
            'file_uuid'
        ]
