import logging

from django.conf import settings
from guardian.shortcuts import get_perms
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import (DataSet, Event, Group, SiteProfile, SiteVideo, User,
                     UserProfile, Workflow)

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
    owner = serializers.SerializerMethodField()
    public = serializers.SerializerMethodField()
    is_clean = serializers.SerializerMethodField()
    file_count = serializers.SerializerMethodField()
    analyses = serializers.SerializerMethodField()
    user_perms = serializers.SerializerMethodField()

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

    class Meta:
        model = DataSet
        fields = ('title', 'accession', 'analyses', 'summary', 'description',
                  'slug', 'uuid', 'modification_date', 'id', 'is_owner',
                  'owner', 'public', 'is_clean', 'file_count', 'user_perms')

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
    perms = serializers.SerializerMethodField()
    uuid = serializers.SerializerMethodField()

    def get_perms(self, group):
        data_set = self.context.get('data_set')
        data_set_perms = get_perms(group, data_set)
        return {'change': 'change_dataset' in data_set_perms,
                'read': 'read_dataset' in data_set_perms,
                'read_meta': 'read_meta_dataset' in data_set_perms}

    def get_uuid(self, group):
        return group.extendedgroup.uuid

    class Meta:
        model = Group
        fields = ('name', 'id', 'uuid', 'perms')


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
        fields = ('first_name', 'last_name', 'profile', 'username')


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
