import logging

from django.conf import settings
from django.contrib.auth.models import Group

from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import DataSet, Event, User, UserProfile, Workflow

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
    file_count = serializers.SerializerMethodField()
    analyses = serializers.SerializerMethodField()

    def get_analyses(self, data_set):
        return [dict(uuid=analysis.uuid,
                     name=analysis.name,
                     status=analysis.status,
                     owner=analysis.get_owner().profile.uuid)
                for analysis in data_set.get_analyses()]

    def get_is_owner(self, data_set):
        try:
            return data_set.is_owner
        except:
            owner = data_set.get_owner()
            try:
                user_request = self.context.get('request').user
            except AttributeError as e:
                logger.error("Request is missing a user: %s", e)
                return False
            return user_request == owner

    def get_public(self, data_set):
        try:
            return data_set.public
        except:
            is_public = data_set.is_public()
            return is_public

    def get_is_clean(self, data_set):
        return data_set.is_clean()

    def get_file_count(self, data_set):
        return data_set.get_file_count()

    class Meta:
        model = DataSet
        fields = ('title', 'accession', 'analyses', 'summary', 'description',
                  'slug', 'uuid', 'modification_date', 'id', 'is_owner',
                  'public', 'is_clean', 'file_count')

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


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group


class UserProfileSerializer(serializers.ModelSerializer):
    primary_group = GroupSerializer(read_only=True)
    # need to update a seperate field due to serializers defaults read-only
    primary_group_id = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(), source='primary_group', write_only=True)

    class Meta:
        model = UserProfile
        fields = ('affiliation', 'has_viewed_launchpad_tut',
                  'has_viewed_data_upload_tut', 'has_viewed_collaboration_tut',
                  'primary_group', 'primary_group_id', 'uuid')

    def validate_primary_group(self, group):
        user = self.context.get('request').user
        if user.id in group.user_set.values_list('id', flat=True):
            pass
        else:
            raise serializers.ValidationError(
                'User is not a member of group, {}'.format(group)
            )

        if group.name != settings.REFINERY_PUBLIC_GROUP_NAME:
            return group.id
        else:
            raise serializers.ValidationError('Primary group can not be '
                                              'the Public group')

    def partial_update(self, instance, validated_data):
        """
        Update and return an existing `UserProfile` instance, given the
        validated data.
        """
        instance.primary_group = validated_data.get('primary_group_id',
                                                    instance.primary_group)
        instance.save()
        return instance


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer()

    class Meta:
        model = User
        fields = ('first_name', 'id', 'last_name', 'profile', 'username')


class WorkflowSerializer(serializers.HyperlinkedModelSerializer):
    instance = serializers.HyperlinkedIdentityField(
        view_name='workflow-detail')
    workflow_engine = serializers.StringRelatedField()

    class Meta:
        model = Workflow


class EventSerializer(serializers.ModelSerializer):
    data_set = DataSetSerializer()
    user = UserSerializer()
    message = serializers.SerializerMethodField()
    details = serializers.JSONField(source="get_details_as_dict")
    date_time = serializers.DateTimeField()

    class Meta:
        model = Event
        fields = (
            'date_time', 'data_set', 'group', 'user',
            'type', 'sub_type', 'details', 'message'
        )

    @staticmethod
    def get_message(obj):
        return unicode(obj)
