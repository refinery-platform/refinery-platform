import ast
import logging

from django.conf import settings
from django.utils import timezone
from guardian.shortcuts import get_perms
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from tool_manager.models import Tool

from .models import (Analysis, DataSet, Event, ExtendedGroup, Invitation,
                     SiteProfile, SiteVideo, User, UserProfile, Workflow)
logger = logging.getLogger(__name__)


class DateTimeWithTimeZone(serializers.DateTimeField):
    '''Helper to override default UTC date time for local time.'''
    def to_representation(self, utc_time):
        local_time = timezone.localtime(utc_time)
        return super(DateTimeWithTimeZone, self).to_representation(local_time)


class AnalysisSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField()
    data_set_uuid = serializers.SerializerMethodField()
    tool_display_name = serializers.SerializerMethodField()
    time_end = DateTimeWithTimeZone()
    time_start = DateTimeWithTimeZone()
    creation_date = serializers.SerializerMethodField()
    workflow_json = serializers.SerializerMethodField()

    class Meta:
        model = Analysis
        fields = ('data_set_uuid', 'facet_name', 'name', 'owner', 'status',
                  'summary', 'time_start', 'time_end', 'tool_display_name',
                  'uuid', 'workflow', 'workflow_json', 'creation_date')

    def get_tool_display_name(self, analysis):
        try:
            tool = Tool.objects.get(analysis_id=analysis.id)
        except (Tool.DoesNotExist, Tool.MultipleObjectsReturned):
            return analysis.name  # tool_display_name defaults to analysis name
        return tool.display_name

    def get_owner(self, analysis):
        return UserSerializer(analysis.get_owner()).data

    def get_data_set_uuid(self, analysis):
        return analysis.data_set.uuid

    def get_creation_date(self, analysis):
        return analysis.time_start

    def get_workflow_json(self, analysis):
        analysis.refresh_from_db()
        return ast.literal_eval(analysis.workflow_copy)


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
    owner = serializers.SerializerMethodField()
    public = serializers.SerializerMethodField()
    is_clean = serializers.SerializerMethodField()
    file_count = serializers.SerializerMethodField()
    analyses = serializers.SerializerMethodField()
    user_perms = serializers.SerializerMethodField()
    version = serializers.SerializerMethodField()

    def get_analyses(self, data_set):
        return [
            dict(uuid=analysis.uuid, name=analysis.name,
                 status=analysis.status,
                 owner=str(analysis.get_owner().profile.uuid))
            for analysis in data_set.get_analyses()
        ]

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

    def get_owner(self, data_set):
        return UserSerializer(data_set.get_owner()).data

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

    def get_user_perms(self, data_set):
        try:
            request_user = self.context.get('request').user
        except AttributeError as e:
            logger.error("Request is missing a user: %s", e)
            return {'change': False,
                    'read': False,
                    'read_meta': False}
        user_perms = get_perms(request_user, data_set)
        return {'change': 'change_dataset' in user_perms,
                'read': 'read_dataset' in user_perms,
                'read_meta': 'read_meta_dataset' in user_perms}

    def get_version(self, data_set):
        return data_set.get_version()

    class Meta:
        model = DataSet
        fields = ('accession', 'analyses', 'creation_date', 'description',
                  'file_count', 'id', 'is_clean', 'is_owner',
                  'modification_date', 'owner', 'public', 'slug', 'summary',
                  'title', 'uuid', 'user_perms', 'version')

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


class ExtendedGroupSerializer(serializers.ModelSerializer):
    manager_group_uuid = serializers.SerializerMethodField()
    member_list = serializers.SerializerMethodField()
    perm_list = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    uuid = serializers.SerializerMethodField()
    name = serializers.CharField(
        min_length=3,
        validators=[UniqueValidator(queryset=ExtendedGroup.objects.all())]
    )

    def get_manager_group_uuid(self, group):
        if group.is_manager_group():
            return ''
        return group.manager_group.uuid

    def get_can_edit(self, group):
        user = self.context.get('user')
        if user is None:
            return False

        if group.is_manager_group():
            return user in group.user_set.all()
        else:
            return user in group.manager_group.user_set.all()

    def get_member_list(self, group):
        # only needed to support dashboard client request
        data_set = self.context.get('data_set')
        if data_set is None:
            users = group.user_set.all().filter(is_active=True).exclude(
                username=settings.ANONYMOUS_USER_NAME
            )
            user_data = UserSerializer(users, many=True).data
            for user in user_data:
                if group.is_manager_group():
                    user['is_manager'] = user.get('id') in \
                                         group.user_set.all().values_list(
                                             'id', flat=True
                                         )
                else:
                    user['is_manager'] = user.get('id') in \
                                         group.manager_group.user_set.all()\
                                             .values_list('id', flat=True)
            return user_data
        return []

    def get_perm_list(self, group):
        data_set = self.context.get('data_set')
        if data_set is None:
            return {}
        data_set_perms = get_perms(group, data_set)
        return {'change': 'change_dataset' in data_set_perms,
                'read': 'read_dataset' in data_set_perms,
                'read_meta': 'read_meta_dataset' in data_set_perms}

    def get_uuid(self, group):
        return group.extendedgroup.uuid

    class Meta:
        model = ExtendedGroup
        fields = ('can_edit', 'name', 'id', 'uuid', 'manager_group_uuid',
                  'member_list', 'perm_list')


class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ('created', 'expires', 'group_id', 'id', 'recipient_email')


class SiteVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteVideo
        fields = ('caption', 'site_profile', 'source', 'source_id', 'id')

    def create(self, validated_data):
        return SiteVideo.objects.create(**validated_data)

    def partial_update(self, instance, validated_data):
        instance.caption = validated_data.get('caption', instance.caption)
        instance.source = validated_data.get('source', instance.source)
        instance.source_id = validated_data.get('source_id',
                                                instance.source_id)
        instance.save()
        return instance


class SiteProfileSerializer(serializers.ModelSerializer):
    site_videos = serializers.SerializerMethodField()

    def get_site_videos(self, site_profile):
        site_videos = site_profile.sitevideo_set.all()
        serializer = SiteVideoSerializer(site_videos, many=True)
        return serializer.data

    class Meta:
        model = SiteProfile
        fields = ('about_markdown', 'site', 'intro_markdown',
                  'twitter_username', 'site_videos')

    def partial_update(self, instance, validated_data):
        """
        Update and return an existing `SiteProfile` instance, given the
        validated data.
        """
        instance.about_markdown = validated_data.get('about_markdown',
                                                     instance.about_markdown)
        instance.intro_markdown = validated_data.get('intro_markdown',
                                                     instance.intro_markdown)
        instance.twitter_username = validated_data.get(
            'twitter_username',  instance.twitter_username
        )
        instance.save()
        return instance


class UserProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserProfile
        fields = ('primary_group', 'uuid')

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
