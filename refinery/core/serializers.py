import logging

from django.conf import settings
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from data_set_manager.models import Node

from .models import DataSet, Event, UserProfile, Workflow

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
    is_owner = serializers.SerializerMethodField()
    public = serializers.SerializerMethodField()
    is_clean = serializers.SerializerMethodField()

    def get_is_owner(self, data_set):
        owner = data_set.get_owner()
        try:
            user_request = self.context.get('request').user
        except AttributeError as e:
            logger.error("Request is missing a user: %s", e)
            return False
        return user_request == owner

    def get_public(self, data_set):
        is_public = data_set.is_public()
        return is_public

    def get_is_clean(self, data_set):
        return data_set.is_clean()

    class Meta:
        model = DataSet
        fields = ['title', 'accession', 'summary', 'description', 'slug',
                  'uuid', 'modification_date', 'id', 'is_owner', 'public',
                  'is_clean']

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


class UserProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserProfile
        fields = ['primary_group']

    def validate_primary_group(self, group):
        user = self.context.get('request').user
        if user.id in group.user_set.values_list('id', flat=True):
            pass
        else:
            raise serializers.ValidationError(
                'User is not a member of group, {}'.format(group)
            )

        if group.name != settings.REFINERY_PUBLIC_GROUP_NAME:
            return group
        else:
            raise serializers.ValidationError('Primary group can not be '
                                              'the Public group')

    def partial_update(self, instance, validated_data):
        """
        Update and return an existing `UserProfile` instance, given the
        validated data.
        """
        instance.primary_group = validated_data.get('primary_group',
                                                    instance.primary_group)
        instance.save()
        return instance


class WorkflowSerializer(serializers.HyperlinkedModelSerializer):
    instance = serializers.HyperlinkedIdentityField(
        view_name='workflow-detail')
    workflow_engine = serializers.StringRelatedField()

    class Meta:
        model = Workflow


class NodeSerializer(serializers.ModelSerializer):
    file_uuid = serializers.CharField(max_length=36,
                                      required=False,
                                      allow_null=True)

    class Meta:
        model = Node
        fields = ['uuid', 'file_uuid']

    def validate_file_uuid(self, file_uuid):
        if file_uuid is not None:
            raise serializers.ValidationError(
                'API does not support adding file store uuids.'
            )
        pass

    def partial_update(self, instance, validated_data):
        """
        Update and return an existing `Node` instance, given the
        validated data.
        """
        instance.file_uuid = validated_data.get('file_uuid',
                                                instance.file_uuid)

        instance.save()
        return instance


class EventSerializer(serializers.ModelSerializer):
    data_set = serializers.SlugRelatedField(
        read_only=True, slug_field='uuid'
    )
    user = serializers.SlugRelatedField(
        read_only=True, slug_field='username'
    )
    message = serializers.SerializerMethodField()
    details = serializers.JSONField(source="get_details_as_dict")
    date_time = serializers.DateTimeField()

    class Meta:
        model = Event
        fields = [
            'date_time', 'data_set', 'group', 'user',
            'type', 'sub_type', 'details', 'message'
        ]

    @staticmethod
    def get_message(obj):
        return str(obj)
