'''
Created on Feb 20, 2012

@author: nils
'''
from __future__ import absolute_import

import ast
import copy
from datetime import datetime
import logging
import os
import smtplib
import socket
import pysolr
from urlparse import urljoin

from django import forms
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.models import Group, Permission, User
from django.contrib.auth.signals import user_logged_in
from django.contrib.contenttypes.models import ContentType
from django.contrib.messages import get_messages
from django.contrib.messages import info
from django.contrib.sites.models import Site
from django.core.mail import send_mail
from django.db import models, transaction
from django.db.models import Max
from django.db.models.fields import IntegerField
from django.db.models.signals import post_delete, post_save, pre_delete
from django.db.utils import IntegrityError
from django.dispatch import receiver
from django.forms import ValidationError
from django.template import Context, loader
from django.utils import timezone

from bioblend import galaxy
from django.template.loader import render_to_string
from django_auth_ldap.backend import LDAPBackend
from django_extensions.db.fields import UUIDField
from guardian.models import UserObjectPermission
from guardian.shortcuts import (assign_perm, get_groups_with_perms,
                                get_objects_for_group, get_users_with_perms,
                                remove_perm)
from registration.models import RegistrationManager, RegistrationProfile
from registration.signals import user_activated, user_registered

from .utils import (add_or_update_user_to_neo4j, add_read_access_in_neo4j,
                    delete_analysis_index, delete_data_set_index,
                    delete_data_set_neo4j, delete_ontology_from_neo4j,
                    delete_user_in_neo4j, email_admin, get_aware_local_time,
                    invalidate_cached_object, remove_read_access_in_neo4j,
                    update_annotation_sets_neo4j, update_data_set_index,
                    skip_if_test_run)
from data_set_manager.models import (Assay, Investigation, Node,
                                     NodeCollection, Study)
from data_set_manager.utils import (add_annotated_nodes_selection,
                                    index_annotated_nodes_selection)
from file_store.models import FileStoreItem, FileType, get_file_size
from file_store.tasks import rename
from galaxy_connector.galaxy_workflow import (configure_workflow,
                                              countWorkflowSteps,
                                              create_expanded_workflow_graph)
from galaxy_connector.models import Instance

logger = logging.getLogger(__name__)

#: Defining available node relationship types
TYPE_1_1 = '1-1'
TYPE_1_N = '1-N'
TYPE_N_1 = 'N-1'
TYPE_REPLICATE = 'replicate'
NR_TYPES = (
    (TYPE_1_1, '1-1'),
    (TYPE_1_N, '1-N'),
    (TYPE_N_1, 'N-1'),
    (TYPE_REPLICATE, 'replicate')
)


class UserProfile(models.Model):
    """Extend Django user model:
    https://docs.djangoproject.com/en/1.7/topics/auth/customizing/#extending-the-existing-user-model

    """
    uuid = UUIDField(unique=True, auto=True)
    user = models.OneToOneField(User, related_name='profile')
    affiliation = models.CharField(max_length=100, blank=True)
    catch_all_project = models.ForeignKey('Project', blank=True, null=True)
    login_count = models.IntegerField(default=0)

    def __unicode__(self):
        return (
            str(self.user.first_name) + " " +
            str(self.user.last_name) + " (" +
            str(self.affiliation) + "): " +
            str(self.user.email)
        )

    def has_viewed_launchpad_tut(self):
        return Tutorials.objects.get(
            user_profile=self).launchpad_tutorial_viewed

    def has_viewed_data_upload_tut(self):
        return Tutorials.objects.get(
            user_profile=self).data_upload_tutorial_viewed

    def has_viewed_collaboration_tut(self):
        return Tutorials.objects.get(
            user_profile=self).collaboration_tutorial_viewed


def get_user_import_dir(user):
    """Return import directory for given user
    :param user: User model
    :return: str - absolute path to user's import dir
    """
    return os.path.join(settings.REFINERY_DATA_IMPORT_DIR, user.username)


def create_user_profile(sender, instance, created, **kwargs):
    """automatic creation of a user profile when a user is created:

    """
    if created:
        UserProfile.objects.get_or_create(user=instance)
        Tutorials.objects.get_or_create(user_profile=instance.profile)


post_save.connect(create_user_profile, sender=User)


@receiver(post_save, sender=User)
def add_user_to_public_group(sender, instance, created, **kwargs):
    """Add users to Public group automatically

    """
    public_group = ExtendedGroup.objects.public_group()
    # need to check if Public group exists to avoid errors when creating
    # user accounts (like superuser and AnonymousUser) before the group
    # is created by init_refinery command
    if public_group:
        instance.groups.add(public_group)


def create_user_profile_registered(sender, user, request, **kwargs):
    UserProfile.objects.get_or_create(user=user)
    Tutorials.objects.get_or_create(user_profile=user.profile)

    logger.info(
        "user profile for user %s has been created after registration",
        user
    )


user_registered.connect(
    create_user_profile_registered,
    dispatch_uid="registered"
)


def messages_dedup(request, msg):
    # Gets rid duplicate messages in the message queue, provided w/ a
    # message  to check for
    if msg not in [m.message for m in get_messages(request)]:
        info(request, msg)


def register_handler(request, sender, user, **kwargs):
    # Send email to user once an Admin activates their account
    user.email_user(settings.REFINERY_WELCOME_EMAIL_SUBJECT,
                    settings.REFINERY_WELCOME_EMAIL_MESSAGE,
                    settings.DEFAULT_FROM_EMAIL)


user_activated.connect(register_handler, dispatch_uid='activated')


# check if user has a catch all project and create one if not
def create_catch_all_project(sender, user, request, **kwargs):
    if user.profile.catch_all_project is None:
        project = Project.objects.create(
            name="Catch-All Project",
            is_catch_all=True
        )
        project.set_owner(user)
        user.profile.catch_all_project = project
        user.profile.save()
        messages.success(
            request,
            "If you don't want to fill your profile out now, you can go to "
            "the <a href='/'>homepage</a>.",
            extra_tags='safe',
            fail_silently=True
        )  # needed to avoid MessageFailure when running tests


def iterate_user_login_count(sender, user, request, **kwargs):
    user.profile.login_count += 1
    user.profile.save()


# create catch all project for user if none exists
user_logged_in.connect(create_catch_all_project)

# Iterate `login_count` to keep track of user's logins
user_logged_in.connect(iterate_user_login_count)


class Tutorials(models.Model):
    """
        Model to keep track of the tutorials that a
        User has viewed
    """
    user_profile = models.ForeignKey(UserProfile)
    launchpad_tutorial_viewed = models.BooleanField(default=False)
    collaboration_tutorial_viewed = models.BooleanField(default=False)
    data_upload_tutorial_viewed = models.BooleanField(default=False)

    def __unicode__(self):
        return (
            "User: {} | Launchpad: {}, Collaboration: {}, DataUpload:"
            " {}".format(
             self.user_profile.user.username,
             self.launchpad_tutorial_viewed,
             self.collaboration_tutorial_viewed,
             self.data_upload_tutorial_viewed
            )
        )


class BaseResource(models.Model):
    """Abstract base class for core resources such as projects, analyses,
    datasets and so on. See
    https://docs.djangoproject.com/en/1.3/topics/db/models/#abstract
    -base-classes
    for details.
    """
    uuid = UUIDField(unique=True, auto=True)
    name = models.CharField(max_length=250, null=True)
    summary = models.CharField(max_length=1000, blank=True)
    creation_date = models.DateTimeField(auto_now_add=True)
    modification_date = models.DateTimeField(auto_now=True)
    description = models.TextField(max_length=5000, blank=True)
    slug = models.CharField(max_length=250, blank=True, null=True)

    def __unicode__(self):
        return self.name + " (" + self.uuid + ")"

    class Meta:
        abstract = True

    def duplicate_slug_exists(self):
        """
        Checks if any other instance within the BaseResource being saved has an
        identical slug. Empty slugs and `None` slugs are not treated as
        duplicates

        :returns: Boolean based on if a duplicate slug exists
        """
        # Catches white spaces passed as slug & removes trail/lead white spaces
        if self.slug:
            self.slug = self.slug.strip()

        # If the slug isn't empty after stripping whitespace
        if self.slug:
            return bool(len(self.__class__.objects.filter(slug=self.slug).
                            exclude(pk=self.pk)))
        else:
            return False

    def clean(self):
        # Check if model being saved/altered in Django Admin has a slug
        # duplicated elsewhere.

        if self.duplicate_slug_exists():
            raise forms.ValidationError("%s with slug: %s "
                                        "already exists"
                                        % (self.__class__.__name__,
                                           self.slug))

    # Overriding save() method to disallow saving objects with duplicate slugs
    def save(self, *args, **kwargs):

        if self.duplicate_slug_exists():
            logger.error("%s with slug: %s already exists" % (
                self.__class__.__name__, self.slug))
        else:
            try:
                super(BaseResource, self).save(*args, **kwargs)
            except Exception as e:
                logger.error("Could not save %s: %s" % (
                    self.__class__.__name__, e))

    # Overriding delete() method For models that Inherit from BaseResource
    def delete(self, using=None, *args, **kwargs):
        super(BaseResource, self).delete()


class OwnableResource(BaseResource):
    """Abstract base class for core resources that can be owned
    (projects, data sets, workflows, workflow engines, etc.)
    IMPORTANT: expects derived classes to have "add/read/change/write_xxx"
    permissions, where "xxx" is the simple_modelname
    """

    def __unicode__(self):
        return self.name

    def set_owner(self, user):
        assign_perm("add_%s" % self._meta.verbose_name, user, self)
        assign_perm("read_%s" % self._meta.verbose_name, user, self)
        assign_perm("delete_%s" % self._meta.verbose_name, user, self)
        assign_perm("change_%s" % self._meta.verbose_name, user, self)

    def get_owner(self):
        # ownership is determined by "add" permission
        user_permissions = get_users_with_perms(
            self,
            attach_perms=True,
            with_group_users=False
        )
        for user, permission in user_permissions.iteritems():
            if "add_%s" % self._meta.verbose_name in permission:
                return user
        return None

    def get_owner_username(self):
        if self.get_owner():
            return self.get_owner().username
        else:
            return "(no owner assigned)"

    def get_owner_full_name(self):
        owner = self.get_owner()
        if owner:
            return owner.get_full_name() or owner.username
        else:
            return "(no owner assigned)"

    class Meta:
        verbose_name = "ownableresource"
        abstract = True


class SharableResource(OwnableResource):
    """Abstract base class for core resources that can be shared
    (projects, data sets, workflows, workflow engines, etc.)
    IMPORTANT:
    expects derived classes to have "add/read/change/write_xxx" + "share_xxx"
    permissions, where "xxx" is the simple_modelname
    """
    share_list = None

    def __unicode__(self):
        return self.name

    def set_owner(self, user):
        super(SharableResource, self).set_owner(user)
        assign_perm("share_%s" % self._meta.verbose_name, user, self)

    """
    Sharing something always grants read and add permission
    Change permission toggled by the value of the readonly flag
    """

    def share(self, group, readonly=True):
        assign_perm('read_%s' % self._meta.verbose_name, group, self)
        assign_perm('add_%s' % self._meta.verbose_name, group, self)
        remove_perm('change_%s' % self._meta.verbose_name, group, self)
        remove_perm('share_%s' % self._meta.verbose_name, group, self)
        remove_perm('delete_%s' % self._meta.verbose_name, group, self)
        if not readonly:
            assign_perm('change_%s' % self._meta.verbose_name, group, self)

    def unshare(self, group):
        remove_perm('read_%s' % self._meta.verbose_name, group, self)
        remove_perm('change_%s' % self._meta.verbose_name, group, self)
        remove_perm('add_%s' % self._meta.verbose_name, group, self)
        remove_perm('delete_%s' % self._meta.verbose_name, group, self)
        remove_perm('share_%s' % self._meta.verbose_name, group, self)

    # TODO: clean this up
    def get_groups(self, changeonly=False, readonly=False):
        permissions = get_groups_with_perms(self, attach_perms=True)

        groups = []

        for group_object, permission_list in permissions.items():
            group = {}
            group["group"] = ExtendedGroup.objects.get(id=group_object.id)
            group["uuid"] = group["group"].uuid
            group["id"] = group["group"].id
            group["change"] = False
            group["read"] = False
            for permission in permission_list:
                if permission.startswith("change"):
                    group["change"] = True
                if permission.startswith("read"):
                    group["read"] = True
            if group["change"] and readonly:
                continue
            if group["read"] and changeonly:
                continue
            groups.append(group)

        return groups

    def get_group_ids(self, changeonly=False, readonly=False):
        groups = get_groups_with_perms(self)

        ids = []

        for group in groups:
            ids.append(group.id)

        return ids

    # TODO: clean this up
    def is_public(self):
        permissions = get_groups_with_perms(self, attach_perms=True)

        for group_object, permission_list in permissions.items():
            if ExtendedGroup.objects.public_group().id == group_object.id:
                for permission in permission_list:
                    if permission.startswith("change"):
                        return True
                    if permission.startswith("read"):
                        return True

        return False

    class Meta:
        verbose_name = "sharableresource"
        abstract = True


class TemporaryResource(models.Model):
    """Mix-in class for temporary resources like NodeSet instances"""
    # Expiration time and date of the instance
    expiration = models.DateTimeField(null=True, blank=True)

    def __unicode__(self):
        return self.name + " (" + self.uuid + ")"

    class Meta:
        abstract = True


class ManageableResource(models.Model):
    """Abstract base class for manageable resources such as disk space and
    workflow engines
    """

    def __unicode__(self):
        return self.name + " (" + self.uuid + ")"

    def set_manager_group(self, group):
        assign_perm("add_%s" % self._meta.verbose_name, group, self)
        assign_perm("read_%s" % self._meta.verbose_name, group, self)
        assign_perm("delete_%s" % self._meta.verbose_name, group, self)
        assign_perm("change_%s" % self._meta.verbose_name, group, self)

    def get_manager_group(self):
        # ownership is determined by "add" permission
        group_permissions = get_groups_with_perms(self, attach_perms=True)

        for group, permission in group_permissions.iteritems():
            if "add_%s" % self._meta.verbose_name in permission:
                return group.extendedgroup

    class Meta:
        verbose_name = "manageableresource"
        abstract = True


class DataSetQuerySet(models.query.QuerySet):
    def delete(self):
        for instance in self:
            try:
                instance.delete()
            except Exception as e:
                return False, "Something unexpected happened. DataSet: {} " \
                              "could not be deleted. {}".format(self, e)


class DataSetManager(models.Manager):
    def get_query_set(self):
        return DataSetQuerySet(self.model, using=self._db)


class DataSet(SharableResource):
    UNTITLED_DATA_SET_TITLE = "Untitled data set"

    # TODO: add function to restore earlier version
    # TODO: add collections (of assays in the investigation) and associate them
    # with the versions
    # total number of files in this data set
    file_count = models.IntegerField(blank=True, null=True, default=0)
    # total number of bytes of all files in this data set
    file_size = models.BigIntegerField(blank=True, null=True, default=0)
    # accession number (e.g. "E-MTAB-2646")
    accession = models.CharField(max_length=32, blank=True, null=True)
    # name of source database for the accession number (e.g. "ArrayExpress")
    accession_source = models.CharField(max_length=128, blank=True, null=True)
    # actual title of the dataset
    title = models.CharField(max_length=250, default=UNTITLED_DATA_SET_TITLE)

    objects = DataSetManager()

    class Meta:
        verbose_name = "dataset"
        permissions = (
            ('read_%s' % verbose_name, 'Can read %s' % verbose_name),
            ('share_%s' % verbose_name, 'Can share %s' % verbose_name),
        )

    def __unicode__(self):
        return (
            unicode(self.name) + u' - ' +
            unicode(self.get_owner_username()) + u' - ' +
            unicode(self.summary)
        )

    def save(self, *args, **kwargs):
        # We need to manually check if the title to be saved is blank because
        # `blank=False` will only affect the admin interface
        try:
            if not self.title.strip():
                self.title = self.UNTITLED_DATA_SET_TITLE
        except AttributeError:
            self.title = self.UNTITLED_DATA_SET_TITLE
        super(DataSet, self).save(*args, **kwargs)

    def delete(self, **kwargs):
        """
        Overrides the DataSet model's delete method.

        Deletes NodeCollection and related object based on uuid of
        Investigations linked to the DataSet.
        This deletes Studys, Assays and Investigations in
        addition to the related objects detected by Django.

        This method will also delete the isa_archive or
        pre_isa_archive associated with the DataSet if one exists.
        """

        try:
            self.get_isa_archive().delete()

        except AttributeError as e:
            logger.debug("DataSet has no isa_archive to delete: %s" % e)

        try:
            self.get_pre_isa_archive().delete()

        except AttributeError as e:
            logger.debug("DataSet has no pre_isa_archive to delete: %s" % e)

        related_investigation_links = self.get_investigation_links()

        for investigation_link in related_investigation_links:

            node_collection = investigation_link.get_node_collection()

            try:
                node_collection.delete()
            except Exception as e:
                logger.error("Couldn't delete NodeCollection:", e)

        # Try to terminate any currently running FileImport tasks just to be
        # safe
        file_store_items = self.get_file_store_items()
        if file_store_items is not None:
            for file_store_item in file_store_items:
                file_store_item.terminate_file_import_task()
        try:
            super(DataSet, self).delete()
        except Exception as e:
            return False, "Something unexpected happened. DataSet: {} could " \
                          "not be deleted. {}".format(self.name, e)
        else:
            # Return a "truthy" value here so that the admin ui and
            # front-end ui knows if the deletion succeeded or not as well as
            # the proper message to  display to the end user
            return True, "DataSet: {} was deleted successfully".format(
                self.name)

    def get_analyses(self):
        return Analysis.objects.filter(data_set=self)

    def get_investigation_links(self):
        return InvestigationLink.objects.filter(data_set=self)

    def get_owner(self):
        owner = None

        content_type_id = ContentType.objects.get_for_model(self).id
        permission_id = Permission.objects.filter(codename='add_dataset')[0].id

        perms = UserObjectPermission.objects.filter(
            content_type_id=content_type_id,
            permission_id=permission_id,
            object_pk=self.id
        )

        if perms.count() > 0:
            try:
                owner = User.objects.get(id=perms[0].user_id)
            except User.DoesNotExist:
                pass

        return owner

    def set_investigation(self, investigation, message=""):
        """Associate this data set with an investigation. If this data set has
        an association with an investigation this association will be cleared
        first. Use update_investigation() to add a new version of the current
        investigation
        """
        self.investigationlink_set.filter(data_set=self).delete()
        link = InvestigationLink(
            data_set=self,
            investigation=investigation,
            version=1,
            message=message
        )
        link.save()
        return 1

    def update_investigation(self, investigation, message):
        version = self.get_version()
        if version is None:
            return self.set_investigation(investigation, message)
        link = InvestigationLink(
            data_set=self,
            investigation=investigation,
            version=version + 1,
            message=message
        )
        link.save()
        return version + 1

    def get_version(self):
        try:
            version = (
                InvestigationLink.objects.filter(
                    data_set=self
                ).aggregate(Max("version"))["version__max"]
            )
            return version
        except:
            return None

    def get_version_details(self, version=None):
        try:
            if version is None:
                version = (
                    InvestigationLink.objects.filter(
                        data_set=self).aggregate(
                        Max("version"))["version__max"]
                )

            return (
                InvestigationLink.objects.filter(
                    data_set=self, version=version).get()
            )
        except:
            return None

    def get_investigation(self, version=None):
        if version is None:
            try:
                max_version = InvestigationLink.objects.filter(
                    data_set=self).aggregate(Max("version"))["version__max"]
            except:
                return None
        else:
            max_version = version
        try:
            il = InvestigationLink.objects.filter(
                data_set=self, version=max_version).get()
        except:
            return None
        return il.investigation

    def get_studies(self, version=None):
        return Study.objects.filter(
            investigation=self.get_investigation(version)
        )

    def get_assays(self, version=None):
        return Assay.objects.filter(
            study=Study.objects.filter(
                investigation=self.get_investigation()
            )
        )

    def get_file_count(self):
        """Returns the number of files in the data set"""
        investigation = self.get_investigation()
        file_count = 0

        for study in investigation.study_set.all():
            file_count += (
                Node.objects
                .filter(study=study.id, file_uuid__isnull=False)
                .count()
            )

        return file_count

    def get_file_size(self):
        """Returns the disk space in bytes used by all files in the data set"""
        investigation = self.get_investigation()
        file_size = 0

        for study in investigation.study_set.all():
            files = Node.objects.filter(
                study=study.id, file_uuid__isnull=False).values("file_uuid")
            for file in files:
                size = get_file_size(
                    file["file_uuid"], report_symlinks=True)
                file_size += size

        return file_size

    def get_isa_archive(self):
        """
        Returns the isa_archive that was used to create the
        DataSet
        """
        investigation = self.get_investigation()

        try:
            return FileStoreItem.objects.get(
                uuid=investigation.isarchive_file)

        except (FileStoreItem.DoesNotExist,
                FileStoreItem.MultipleObjectsReturned,
                AttributeError) as e:
            logger.debug("Couldn't fetch FileStoreItem: %s" % e)

    def get_pre_isa_archive(self):
        """
        Returns the pre_isa_archive that was used to create the
        DataSet
        """
        investigation = self.get_investigation()

        try:
            return FileStoreItem.objects.get(
                    uuid=investigation.pre_isarchive_file)

        except (FileStoreItem.DoesNotExist,
                FileStoreItem.MultipleObjectsReturned,
                AttributeError) as e:
            logger.debug("Couldn't fetch FileStoreItem: %s" % e)

    def share(self, group, readonly=True):
        super(DataSet, self).share(group, readonly)
        update_data_set_index(self)
        invalidate_cached_object(self)
        user_ids = map(lambda user: user.id, group.user_set.all())

        # We need to give the anonymous user read access too.
        if group.id == ExtendedGroup.objects.public_group().id:
            user_ids.append(-1)

        add_read_access_in_neo4j(
            [self.uuid],
            user_ids
        )

    def unshare(self, group):
        super(DataSet, self).unshare(group)
        update_data_set_index(self)
        # Need to check if the users of the group that is unshared still have
        # access via other groups or by ownership
        users = group.user_set.all()
        user_ids = []
        for user in users:
            if not user.has_perm('core.read_dataset', DataSet):
                user_ids.append(user.id)

        # We need to give the anonymous user read access too.
        if group.id == ExtendedGroup.objects.public_group().id:
            user_ids.append(-1)

        if user_ids:
            remove_read_access_in_neo4j(
                [self.uuid],
                user_ids
            )

    def get_file_store_items(self):
        investigation = self.get_investigation()

        try:
            study = Study.objects.get(investigation=investigation)
            nodes = Node.objects.filter(study=study)
        except (Study.DoesNotExist, Study.MultipleObjectsReturned) as e:
            logger.error("Could not fetch Study properly: %s", e)
        else:
            file_store_items = []

            for node in nodes:
                try:
                    file_store_items.append(
                        FileStoreItem.objects.get(uuid=node.file_uuid)
                    )

                except(FileStoreItem.DoesNotExist,
                       FileStoreItem.MultipleObjectsReturned) as e:
                    logger.error("Error while fetching FileStoreItem: %s", e)

            return file_store_items


@receiver(pre_delete, sender=DataSet)
def _dataset_delete(sender, instance, *args, **kwargs):
    delete_data_set_index(instance)
    delete_data_set_neo4j(instance.uuid)
    update_annotation_sets_neo4j()


@receiver(post_save, sender=DataSet)
def _dataset_saved(**kwargs):
    update_annotation_sets_neo4j()


class InvestigationLink(models.Model):
    data_set = models.ForeignKey(DataSet)
    investigation = models.ForeignKey(Investigation)
    version = models.IntegerField(default=1)
    message = models.CharField(max_length=500, blank=True, null=True)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('data_set', 'investigation', 'version')

    def __unicode__(self):
        retstr = (
            "%s: ver=%s, %s"
            % (self.investigation.get_identifier(), self.version, self.message)
        )
        return retstr

    def get_node_collection(self):
        try:
            return NodeCollection.objects.get(
                uuid=self.investigation.uuid)
        except (NodeCollection.DoesNotExist,
                NodeCollection.MultipleObjectsReturned) as e:
            logger.error(("Could not fetch NodeCollection: " % e))


class WorkflowDataInput(models.Model):
    name = models.CharField(max_length=200)
    internal_id = models.IntegerField()

    def __unicode__(self):
        return self.name + " (" + str(self.internal_id) + ")"


class WorkflowEngine(OwnableResource, ManageableResource):
    # TODO: remove Galaxy dependency
    instance = models.ForeignKey(Instance, blank=True)

    def __unicode__(self):
        return str(self.name) + " - " + str(self.summary)

    class Meta:
        verbose_name = "workflowengine"
        permissions = (
            ('read_%s' % verbose_name, 'Can read %s' % verbose_name),
        )


class DiskQuota(SharableResource, ManageableResource):
    # quota is given in bytes
    maximum = models.IntegerField()
    current = models.IntegerField()

    def __unicode__(self):
        return (
            self.name + " - Quota: " + str(
                self.current / (1024 * 1024 * 1024)) +
            " of " + str(self.maximum / (1024 * 1024 * 1024)) + "GB available"
        )

    class Meta:
        verbose_name = "diskquota"
        permissions = (
            ('read_%s' % verbose_name, 'Can read %s' % verbose_name),
            ('share_%s' % verbose_name, 'Can share %s' % verbose_name),
        )


class WorkflowInputRelationships(models.Model):
    """Defines relationships between inputs based on the input string
    assoicated with each workflow i.e refinery_relationship=[{"category":"1-1",
    "set1":"input_file", "set2":"exp_file"}]
    """
    category = models.CharField(max_length=15, choices=NR_TYPES, blank=True)
    set1 = models.CharField(max_length=50)
    set2 = models.CharField(max_length=50, blank=True, null=True)

    def __unicode__(self):
        return (
            str(self.category) + " - " + str(self.set1) + "," + str(self.set2)
        )


class WorkflowQuerySet(models.query.QuerySet):
    def delete(self):
        for instance in self:
            instance.delete()


class WorkflowManager(models.Manager):
    def get_query_set(self):
        return WorkflowQuerySet(self.model, using=self._db)


class Workflow(SharableResource, ManageableResource):
    ANALYSIS_TYPE = "analysis"
    DOWNLOAD_TYPE = "download"
    TYPE_CHOICES = (
        (
            ANALYSIS_TYPE,
            "Workflow performs data analysis tasks. Results are merged into "
            "dataset."
        ),
        (
            DOWNLOAD_TYPE,
            "Workflow creates bulk downloads. Results are add to user's "
            "download list."
        ),
    )

    data_inputs = models.ManyToManyField(WorkflowDataInput, blank=True)
    internal_id = models.CharField(max_length=50)
    workflow_engine = models.ForeignKey(WorkflowEngine)
    show_in_repository_mode = models.BooleanField(default=False)
    input_relationships = models.ManyToManyField(
        WorkflowInputRelationships,
        blank=True
    )
    is_active = models.BooleanField(default=False, null=False, blank=False)
    type = models.CharField(
        default=ANALYSIS_TYPE,
        null=False,
        blank=False,
        choices=TYPE_CHOICES,
        max_length=25
    )
    graph = models.TextField(null=True, blank=True)

    objects = WorkflowManager()

    def __unicode__(self):
        return self.name + " - " + self.summary

    class Meta:
        # unique_together = ('internal_id', 'workflow_engine')
        verbose_name = "workflow"
        permissions = (
            ('read_%s' % verbose_name, 'Can read %s' % verbose_name),
            ('share_%s' % verbose_name, 'Can share %s' % verbose_name),
        )

    def get_analyses(self):
        return Analysis.objects.filter(workflow=self)

    def delete(self, **kwargs):
        '''
        Overrides the Workflow model's delete method and checks if an
        Analysis has been run utilizing it
        '''

        if self.get_analyses().count() > 0:
            # Hide Workflow from ui if an Analysis has been run on it

            self.is_active = False
            # Prepare string to display upon a failed deletion
            deletion_error_message = "Could not delete Workflow: {}, " \
                                     "These Analyses have been run " \
                                     "utilizing it: {}. Setting it as " \
                                     "'inactive'".format(
                                            self.name, self.get_analyses()
                                        )
            logger.error(deletion_error_message)

            self.save()

            # Return a "falsey" value here so that the admin ui knows if the
            # deletion succeeded or not as well as the proper message to
            # display to the end user
            return False, deletion_error_message

        else:
            '''
                If an Analysis hasn't been run on said Workflow delete
                WorkflowDataInputs and WorkflowInputRelationships if they exist
            '''
            try:
                self.data_inputs.remove()
            except Exception as e:
                logger.error("Could not delete WorkflowDataInput", e)
            try:
                self.input_relationships.remove()
            except Exception as e:
                logger.error("Could not delete WorkflowInputRelationship", e)

            super(Workflow, self).delete()

            # Return a "truthy" value here so that the admin ui knows if the
            # deletion succeeded or not as well as the proper message to
            # display to the end user
            return True, "Workflow: {} was deleted successfully".format(
                self.name)


class Project(SharableResource):
    is_catch_all = models.BooleanField(default=False)

    def __unicode__(self):
        return (
            str(self.name) + " - " + str(self.get_owner_username()) + " - " +
            str(self.summary)
        )

    class Meta:
        verbose_name = "project"
        permissions = (
            ('read_%s' % verbose_name, 'Can read %s' % verbose_name),
            ('share_%s' % verbose_name, 'Can share %s' % verbose_name),
        )


class WorkflowFilesDL(models.Model):
    step_id = models.TextField()
    pair_id = models.TextField()
    filename = models.TextField()

    def __unicode__(self):
        return (
            str(self.step_id) + " <-> " +
            str(self.pair_id) + "<->" +
            self.filename
        )


class WorkflowDataInputMap(models.Model):
    workflow_data_input_name = models.CharField(max_length=200)
    data_uuid = UUIDField(auto=False)
    pair_id = models.IntegerField(blank=True, null=True)

    def __unicode__(self):
        return str(self.workflow_data_input_name) + " <-> " + self.data_uuid


class AnalysisResult(models.Model):
    analysis_uuid = UUIDField(auto=False)
    file_store_uuid = UUIDField(auto=False)
    file_name = models.TextField()
    file_type = models.TextField()

    # many to many to nodes uuid

    # associated tdf file
    # ## TODO ### ?galaxy_id?
    # add reference to file_store models
    # foreign key into analysis
    # analysis = models.ForeignKey('Analysis')

    def __unicode__(self):
        return str(self.file_name) + " <-> " + self.analysis_uuid

    class Meta:
        verbose_name = "analysis result"
        verbose_name_plural = "analysis results"
        permissions = (
            ('read_%s' % verbose_name, 'Can read %s' % verbose_name),
        )


class AnalysisQuerySet(models.query.QuerySet):
    def delete(self):
        for instance in self:
            instance.delete()


class AnalysisManager(models.Manager):
    def get_query_set(self):
        return AnalysisQuerySet(self.model, using=self._db)


class Analysis(OwnableResource):
    SUCCESS_STATUS = "SUCCESS"
    FAILURE_STATUS = "FAILURE"
    RUNNING_STATUS = "RUNNING"
    INITIALIZED_STATUS = "INITIALIZED"
    UNKNOWN_STATUS = "UNKNOWN"  # analysis status from Galaxy is not available
    STATUS_CHOICES = (
        (SUCCESS_STATUS, "Analysis finished successfully"),
        (FAILURE_STATUS, "Analysis terminated after errors"),
        (RUNNING_STATUS, "Analysis is running"),
        (INITIALIZED_STATUS, "Analysis was initialized"),
    )
    project = models.ForeignKey(Project, related_name="analyses")
    data_set = models.ForeignKey(DataSet, blank=True)
    workflow = models.ForeignKey(Workflow, blank=True)
    workflow_data_input_maps = models.ManyToManyField(WorkflowDataInputMap,
                                                      blank=True)
    workflow_steps_num = models.IntegerField(blank=True, null=True)
    workflow_copy = models.TextField(blank=True, null=True)
    history_id = models.TextField(blank=True, null=True)
    workflow_galaxy_id = models.TextField(blank=True, null=True)
    library_id = models.TextField(blank=True, null=True)
    results = models.ManyToManyField(AnalysisResult, blank=True)
    workflow_dl_files = models.ManyToManyField(WorkflowFilesDL, blank=True)
    time_start = models.DateTimeField(blank=True, null=True)
    time_end = models.DateTimeField(blank=True, null=True)
    status = models.TextField(default=INITIALIZED_STATUS,
                              choices=STATUS_CHOICES, blank=True, null=True)
    status_detail = models.TextField(blank=True, null=True)
    # indicates if a user requested cancellation of this analysis
    canceled = models.BooleanField(default=False)
    # possibly replace results
    # output_nodes = models.ManyToManyField(Nodes, blank=True)
    # protocol = i.e. protocol node created when the analysis is created

    objects = AnalysisManager()

    def __unicode__(self):
        return (
            self.name + " - " +
            self.get_owner_username() + " - " +
            self.summary
        )

    class Meta:
        verbose_name = "analysis"
        verbose_name_plural = "analyses"
        permissions = (
            ('read_%s' % verbose_name, 'Can read %s' % verbose_name),
        )
        ordering = ['-time_end', '-time_start']

    def delete(self, **kwargs):
        """
        Overrides the Analysis model's delete method and checks if
        any Nodes created by the Analysis being deleted have been
        analyzed further.

        If None of the Analysis' Nodes have been analyzed further, let us:
        1. Delete associated FileStoreItems
        2. Delete AnalysisResults
        3. Optimize Solr's index to reflect that
        4. Delete the Nodes
        5. Continue on to delete the Analysis,
        WorkflowFilesDls, WorkflowDataInputMaps,
        AnalysisNodeConnections, and AnalysisStatus'
        """

        delete = True
        nodes = self.get_nodes()

        for node in nodes:

            analysis_node_connections_for_node = \
                node.get_analysis_node_connections()

            for analysis_node_connection in analysis_node_connections_for_node:
                if analysis_node_connection.direction == 'in':
                    delete = False

        if delete:
            # Cancel Analysis (galaxy cleanup also happens here)
            self.cancel()

            # Delete associated AnalysisResults
            self.get_analysis_results().delete()

            for node in nodes:
                # Delete associated FileStoreItems
                if node.file_uuid:
                    node.get_file_store_item().delete()

                # Remove Nodes from Solr's Index
                try:
                    delete_analysis_index(node)
                except Exception as e:
                    logger.debug("No NodeIndex exists in Solr with id "
                                 "%s:  %s", node.id, e)

            # Optimize Solr's index to get rid of any traces of the Analysis
            self.optimize_solr_index()

            # Delete Nodes Associated w/ the Analysis
            nodes.delete()

            super(Analysis, self).delete()

            # Return a "truthy" value here so that the admin ui and
            # front-end ui knows if the deletion succeeded or not as well as
            # the proper message to display to the end user
            return True, "Analysis: {} was deleted successfully".format(
                self.name)

        else:
            # Prepare string to be displayed upon a failed deletion
            deletion_error_message = "Cannot delete Analysis: {} because " \
                                     "its results have been used to run " \
                                     "further Analyses. Please delete all " \
                                     "downstream Analyses before you delete " \
                                     "this one".format(self.name)

            logger.error(deletion_error_message)

            # Return a "falsey" value here so that the admin ui and
            # front-end ui knows if the deletion succeeded or not as well as
            # the proper message to display to the end user
            return False, deletion_error_message

    def get_status(self):
        return self.status

    def get_nodes(self):
        return Node.objects.filter(
            analysis_uuid=self.uuid)

    def get_analysis_results(self):
        return AnalysisResult.objects.filter(analysis_uuid=self.uuid)

    def optimize_solr_index(self):
        solr = pysolr.Solr(urljoin(settings.REFINERY_SOLR_BASE_URL,
                                   "data_set_manager"), timeout=10)
        '''
            solr.optimize() Tells Solr to streamline the number of segments
            used, essentially a defragmentation/ garbage collection
            operation.
        '''
        try:
            solr.optimize()
        except Exception as e:
            logger.error("Could not optimize Solr's index: %s", e)

    def set_status(self, status, message=''):
        """Set analysis status and perform additional actions as required"""
        self.status = status
        self.status_detail = message
        if status == self.FAILURE_STATUS or status == self.SUCCESS_STATUS:
            self.time_end = timezone.now()
        self.save()

    def successful(self):
        return self.get_status() == self.SUCCESS_STATUS

    def failed(self):
        return self.get_status() == self.FAILURE_STATUS

    def running(self):
        return self.get_status() == self.RUNNING_STATUS

    def galaxy_connection(self):
        return self.workflow.workflow_engine.instance.galaxy_connection()

    def prepare_galaxy(self):
        """Prepare for analysis execution in Galaxy"""
        error_msg = "Preparing Galaxy analysis failed: "
        connection = self.galaxy_connection()

        # creates new library in galaxy
        library_name = "{} Analysis - {} ({})".format(
            Site.objects.get_current().name, self.uuid,
            get_aware_local_time())
        try:
            library = connection.libraries.create_library(library_name)
        except galaxy.client.ConnectionError as exc:
            logger.error(error_msg +
                         "can not create Galaxy library for analysis '%s': %s",
                         self.name, exc.message)
            raise

        # generates same ret_list purely based on analysis object
        ret_list = self.get_config()
        try:
            workflow_dict = connection.workflows.export_workflow_json(
                self.workflow.internal_id)
        except galaxy.client.ConnectionError as exc:
            logger.error(error_msg +
                         "can not download Galaxy workflow for analysis '%s': "
                         "%s", self.name, exc.message)
            raise

        # getting expanded workflow configured based on input: ret_list
        new_workflow, history_download, analysis_node_connections = \
            configure_workflow(workflow_dict, ret_list)

        # import connections into database
        for analysis_node_connection in analysis_node_connections:
            # lookup node object
            if analysis_node_connection["node_uuid"]:
                node = Node.objects.get(
                    uuid=analysis_node_connection["node_uuid"])
            else:
                node = None
            AnalysisNodeConnection.objects.create(
                analysis=self,
                subanalysis=analysis_node_connection['subanalysis'],
                node=node,
                step=int(analysis_node_connection['step']),
                name=analysis_node_connection['name'],
                filename=analysis_node_connection['filename'],
                filetype=analysis_node_connection['filetype'],
                direction=analysis_node_connection['direction'],
                is_refinery_file=analysis_node_connection['is_refinery_file']
            )
        # saving outputs of workflow to download
        for file_dl in history_download:
            temp_dl = WorkflowFilesDL(step_id=file_dl['step_id'],
                                      pair_id=file_dl['pair_id'],
                                      filename=file_dl['name'])
            temp_dl.save()
            self.workflow_dl_files.add(temp_dl)
            self.save()

        # import newly generated workflow
        try:
            new_workflow_info = connection.workflows.import_workflow_json(
                new_workflow)
        except galaxy.client.ConnectionError as exc:
            logger.error(error_msg +
                         "error importing workflow into Galaxy for analysis "
                         "'%s': %s", self.name, exc.message)
            raise

        # getting number of steps for current workflow
        new_workflow_steps = countWorkflowSteps(new_workflow)

        # creates new history in galaxy
        history_name = "{} Analysis - {} ({})".format(
            Site.objects.get_current().name, self.uuid,
            get_aware_local_time())
        try:
            history = connection.histories.create_history(history_name)
        except galaxy.client.ConnectionError as e:
            error_msg += "error creating Galaxy history for analysis '%s': %s"
            logger.error(error_msg, self.name, e.message)
            raise

        # updating analysis object
        self.workflow_copy = new_workflow
        self.workflow_steps_num = new_workflow_steps
        self.workflow_galaxy_id = new_workflow_info['id']
        self.library_id = library['id']
        self.history_id = history['id']
        self.save()

    def galaxy_progress(self):
        """Return analysis progress in Galaxy"""
        connection = self.galaxy_connection()
        try:
            history = connection.histories.get_status(self.history_id)
        except galaxy.client.ConnectionError as exc:
            error_msg = "Unable to get progress for history {} of analysis " \
                        "{}: {}".format(self.history_id, self.name, exc)
            # if history with provided ID doesn't exist (HTTP 400)
            if '400' in str(exc):
                logger.error(error_msg)
                self.set_status(Analysis.FAILURE_STATUS, error_msg)
                raise RuntimeError()
            else:
                logger.warning(error_msg)
                self.set_status(Analysis.UNKNOWN_STATUS, error_msg)
                raise

        if (history['state'] == 'error' or
                history['state_details']['error'] > 0):
            error_msg = "Analysis '{}' failed in Galaxy".format(self)
            logger.error(error_msg)
            self.set_status(Analysis.FAILURE_STATUS, error_msg)
            raise RuntimeError()

        return history['percent_complete']

    def galaxy_cleanup(self):
        """Determine when/if Galaxy libraries, workflows and histories are
        to be deleted based on the value of
        global setting: REFINERY_GALAXY_ANALYSIS_CLEANUP"""

        cleanup = settings.REFINERY_GALAXY_ANALYSIS_CLEANUP

        if (cleanup == 'always' or
                cleanup == 'on_success' and
                self.get_status() == self.SUCCESS_STATUS):

            connection = self.galaxy_connection()
            error_msg = "Error deleting Galaxy %s for analysis '%s': %s"

            # Delete Galaxy libraries, workflows and histories
            if self.library_id:
                try:
                    connection.libraries.delete_library(self.library_id)
                except galaxy.client.ConnectionError as e:
                    logger.error(error_msg, 'library', self.name, e.message)

            if self.workflow_galaxy_id:
                try:
                    connection.workflows.delete_workflow(
                        self.workflow_galaxy_id)
                except galaxy.client.ConnectionError as e:
                    logger.error(error_msg, 'workflow', self.name, e.message)

            if self.history_id:
                try:
                    connection.histories.delete_history(self.history_id,
                                                        purge=True)
                except galaxy.client.ConnectionError as e:
                    logger.error(error_msg, 'history', self.name, e.message)

    def cancel(self):
        """Mark analysis as cancelled"""
        self.canceled = True
        self.set_status(Analysis.FAILURE_STATUS, "Cancelled at user's request")
        # jobs in a running workflow are stopped by deleting its history
        self.galaxy_cleanup()

    def get_input_file_uuid_list(self):
        """Return a list of all input file UUIDs"""
        input_file_uuid_list = []
        for files in self.workflow_data_input_maps.all():
            cur_node_uuid = files.data_uuid
            cur_fs_uuid = Node.objects.get(
                uuid=cur_node_uuid).file_uuid
            input_file_uuid_list.append(cur_fs_uuid)
        return input_file_uuid_list

    def send_email(self):
        """Sends an email when the analysis is finished"""
        # don't mail the user if analysis was canceled
        if self.canceled:
            return

        # get basic information
        user = self.get_owner()
        name = self.name
        site_name = Site.objects.get_current().name
        site_domain = Site.objects.get_current().domain
        status = self.status
        data_set_uuid = self.data_set.uuid
        # check status and change text slightly based on that
        # set context for things needed in all emails
        context_dict = {'name': name,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'username': user.username,
                        'site_name': site_name,
                        'site_domain': site_domain,
                        'success': self.successful(),
                        'uuid': self.uuid
                        }
        if self.successful():
            email_subj = "[{}] Archive ready for download: {}".format(
                site_name, name)
            # TODO: avoid hardcoding URL protocol
            context_dict['url'] = urljoin(
                "http://" + site_domain,
                "data_sets/" + data_set_uuid + "/analysis/" + self.uuid)
        else:
            email_subj = "[{}] Archive creation failed: {}".format(
                site_name, name)
            context_dict['default_email'] = settings.DEFAULT_FROM_EMAIL

        if settings.REFINERY_REPOSITORY_MODE:
            temp_loader = loader.get_template(
                'analysis_manager/analysis_email_repository.txt')
        else:
            workflow = self.workflow.name
            project = self.project

            start = timezone.localtime(self.time_start)
            end = timezone.localtime(self.time_end)

            duration = end - start
            hours, remainder = divmod(duration.total_seconds(), 3600)
            minutes, seconds = divmod(remainder, 60)

            # formatting the duration string
            hours = int(hours)
            minutes = int(minutes)
            if hours < 10:
                hours = '0%s' % hours
            if minutes < 10:
                minutes = '0%s' % minutes
            duration = "%s:%s hours" % (hours, minutes)

            # fill in extra context
            context_dict['workflow'] = workflow
            context_dict['project'] = project
            context_dict['dataset'] = self.data_set.name
            context_dict['start'] = datetime.strftime(start, '%A, %d %B %G %r')
            context_dict['end'] = datetime.strftime(end, '%A, %d %B %G %r')
            context_dict['duration'] = duration

            # get email contents ready
            email_subj = "[{}] {}: {} ({})".format(
                site_name, status, name, workflow)
            temp_loader = loader.get_template(
                'analysis_manager/analysis_email_full.txt')

        context = Context(context_dict)
        try:
            user.email_user(email_subj, temp_loader.render(context))
        except smtplib.SMTPException as exc:
            logger.error("Error sending email to '%s' for analysis '%s': %s",
                         user.email, name, exc)
        except socket.error:
            logger.error(
                "Email server error: status '%s' to '%s' for analysis '%s' "
                "with UUID '%s'",
                self.get_status(), user.email, name, self.uuid)
        else:
            logger.info(
                "Emailed completion message: status '%s' to '%s' for analysis "
                "'%s' with UUID '%s'",
                self.get_status(), user.email, name, self.uuid)

    def rename_results(self):
        """Rename files in file_store after download"""
        logger.debug("Renaming analysis results")
        # rename file_store items to new name updated from galaxy file_ids
        for result in AnalysisResult.objects.filter(analysis_uuid=self.uuid):
            # new name to load
            new_file_name = result.file_name
            # workaround for FastQC reports downloaded from Galaxy as zip
            # archives
            (root, ext) = os.path.splitext(new_file_name)
            item = FileStoreItem.objects.get_item(uuid=result.file_store_uuid)
            if ext == '.html':
                try:
                    zipfile = FileType.objects.get(name="ZIP")
                except (FileType.DoesNotExist,
                        FileType.MultipleObjectsReturned) as exc:
                    logger.error("Error renaming HTML to zip: %s", exc)
                else:
                    if item.get_filetype() == zipfile:
                        new_file_name = ''.join([root, '.zip'])
            renamed_file_store_item_uuid = rename(
                result.file_store_uuid, new_file_name)

            # Try to generate an auxiliary node for visualization purposes
            # NOTE: We have to do this after renaming happens because before
            #  renaming, said FileStoreItems's datafile field does not point
            #  to an actual file
            try:
                node = Node.objects.get(
                    file_uuid=renamed_file_store_item_uuid)
            except (Node.DoesNotExist, Node.MultipleObjectsReturned) as e:
                logger.error("Error Fetching Node: %s", e)
            else:
                if node.is_derived():
                    node.run_generate_auxiliary_node_task()

    def get_config(self):
        # TEST RECREATING RET_LIST DICTIONARY FROM ANALYSIS MODEL
        # getting distinct workflow inputs
        annot_inputs = {}
        for data_input in self.workflow.data_inputs.all():
            input_type = data_input.name
            annot_inputs[input_type] = None
        ret_list = []
        ret_item = copy.deepcopy(annot_inputs)
        temp_count = 0
        temp_len = len(annot_inputs)
        t2 = self.workflow_data_input_maps.all().order_by('pair_id')
        for wd in t2:
            if ret_item[wd.workflow_data_input_name] is None:
                ret_item[wd.workflow_data_input_name] = {
                    'pair_id': wd.pair_id,
                    'node_uuid': wd.data_uuid
                }
                temp_count += 1
            if temp_count == temp_len:
                ret_list.append(ret_item)
                ret_item = copy.deepcopy(annot_inputs)
                temp_count = 0
        return ret_list

    def attach_outputs_dataset(self):
        # for testing: attach workflow graph and output files to data set graph
        # 0. get study and assay from the first input node
        study = AnalysisNodeConnection.objects.filter(
            analysis=self, direction=INPUT_CONNECTION)[0].node.study
        assay = AnalysisNodeConnection.objects.filter(
            analysis=self, direction=INPUT_CONNECTION)[0].node.assay
        # 1. read workflow into graph
        graph = create_expanded_workflow_graph(
            ast.literal_eval(self.workflow_copy))
        # 2. create data transformation nodes for all tool nodes
        data_transformation_nodes = [graph.node[node_id]
                                     for node_id in graph.nodes()
                                     if graph.node[node_id]['type'] == "tool"]
        for data_transformation_node in data_transformation_nodes:
            # TODO: incorporate subanalysis id in tool name???
            data_transformation_node['node'] = \
                Node.objects.create(
                    study=study, assay=assay, analysis_uuid=self.uuid,
                    type=Node.DATA_TRANSFORMATION,
                    name=data_transformation_node['tool_id'] + '_' +
                    data_transformation_node['name']
                )
        # 3. create connection from input nodes to first data transformation
        # nodes (input tool nodes in the graph are skipped)
        for input_connection in AnalysisNodeConnection.objects.filter(
                analysis=self, direction=INPUT_CONNECTION):
            for edge in graph.edges_iter([input_connection.step]):
                if (graph[edge[0]][edge[1]]['output_id'] ==
                        str(input_connection.step) + '_' +
                        input_connection.filename):
                    input_node_id = edge[1]
                    data_transformation_node = \
                        graph.node[input_node_id]['node']
                    input_connection.node.add_child(data_transformation_node)
        # 4. create derived data file nodes for all entries and connect to data
        # transformation nodes
        for output_connection in AnalysisNodeConnection.objects.filter(
                analysis=self, direction=OUTPUT_CONNECTION):
            # create derived data file node
            derived_data_file_node = \
                Node.objects.create(
                    study=study, assay=assay,
                    type=Node.DERIVED_DATA_FILE,
                    name=output_connection.name, analysis_uuid=self.uuid,
                    subanalysis=output_connection.subanalysis,
                    workflow_output=output_connection.name)
            # retrieve uuid of corresponding output file if exists
            logger.info("Results for '%s' and %s.%s: %s",
                        self.uuid,
                        output_connection.filename, output_connection.filetype,
                        str(AnalysisResult.objects.filter(
                            analysis_uuid=self.uuid,
                            file_name=(output_connection.name + "." +
                                       output_connection.filetype)).count()))
            analysis_results = AnalysisResult.objects.filter(
                analysis_uuid=self.uuid,
                file_name=(output_connection.name + "." +
                           output_connection.filetype))

            if analysis_results.count() == 0:
                logger.info("No output file found for node '%s' ('%s')",
                            derived_data_file_node.name,
                            derived_data_file_node.uuid)

            if analysis_results.count() == 1:
                derived_data_file_node.file_uuid = \
                    analysis_results[0].file_store_uuid
                logger.debug(
                    "Output file %s.%s ('%s') assigned to node %s ('%s')",
                    output_connection.name,
                    output_connection.filetype,
                    analysis_results[0].file_store_uuid,
                    derived_data_file_node.name,
                    derived_data_file_node.uuid)

            if analysis_results.count() > 1:
                logger.warning("Multiple output files returned for '%s.%s'." +
                               "No assignment to output node was made.",
                               output_connection.filename,
                               output_connection.filetype)
            output_connection.node = derived_data_file_node
            output_connection.save()
            # get graph edge that corresponds to this output node:
            # a. attach output node to source data transformation node
            # b. attach output node to target data transformation node
            # (if exists)
            if len(graph.edges([output_connection.step])) > 0:
                for edge in graph.edges_iter([output_connection.step]):
                    if (graph[edge[0]][edge[1]]['output_id'] ==
                        str(output_connection.step) + "_" +
                            output_connection.filename):
                        output_node_id = edge[0]
                        input_node_id = edge[1]
                        data_transformation_output_node = \
                            graph.node[output_node_id]['node']
                        data_transformation_input_node = \
                            graph.node[input_node_id]['node']
                        data_transformation_output_node.add_child(
                            derived_data_file_node)
                        derived_data_file_node.add_child(
                            data_transformation_input_node)
                        # TODO: here we could add a (Refinery internal)
                        # attribute to the derived data file node to indicate
                        # which output of the tool it corresponds to
            # connect outputs that are not inputs for any data transformation
            if (output_connection.is_refinery_file and
                    derived_data_file_node.parents.count() == 0):
                graph.node[output_connection.step]['node'].add_child(
                    derived_data_file_node)
            # delete output nodes that are not refinery files and don't have
            # any children
            if (not output_connection.is_refinery_file and
                    derived_data_file_node.children.count() == 0):
                output_connection.node.delete()

        # 5. create annotated nodes and index new nodes
        node_uuids = AnalysisNodeConnection.objects.filter(
            analysis=self, direction=OUTPUT_CONNECTION, is_refinery_file=True
        ).values_list('node__uuid', flat=True)
        add_annotated_nodes_selection(
            node_uuids, Node.DERIVED_DATA_FILE,
            study.uuid, assay.uuid)
        index_annotated_nodes_selection(node_uuids)

    def attach_outputs_downloads(self):
        analysis_results = AnalysisResult.objects.filter(
            analysis_uuid=self.uuid)

        if analysis_results.count() == 0:
            logger.error("No results for download '%s' ('%s')",
                         self.name, self.uuid)
            return

        for analysis_result in analysis_results:
            item = FileStoreItem.objects.get(
                uuid=analysis_result.file_store_uuid)
            if item:
                download = Download.objects.create(name=self.name,
                                                   data_set=self.data_set,
                                                   file_store_item=item)
                download.set_owner(self.get_owner())
            else:
                logger.warning(
                    "No file found for '%s' in download '%s' ('%s')",
                    analysis_result.file_store_uuid, self.name, self.uuid)


#: Defining available relationship types
INPUT_CONNECTION = 'in'
OUTPUT_CONNECTION = 'out'
WORKFLOW_NODE_CONNECTION_TYPES = (
    (INPUT_CONNECTION, 'in'),
    (OUTPUT_CONNECTION, 'out'),
)


class AnalysisNodeConnection(models.Model):
    analysis = models.ForeignKey(Analysis,
                                 related_name="workflow_node_connections")
    # an identifier assigned to all connections to a specific instance of the
    # workflow template
    # (unique within the analysis)
    subanalysis = IntegerField(null=True, blank=False)
    node = models.ForeignKey(Node,
                             related_name="workflow_node_connections",
                             null=True, blank=True, default=None)
    # step id in the expanded workflow template, e.g. 10
    step = models.IntegerField(null=False, blank=False)

    # (display) name for an output file "wig_outfile" or "outfile"
    # (unique for a given workflow template)
    name = models.CharField(null=False, blank=False, max_length=100)
    # file name of the connection, e.g. "wig_outfile" or "outfile"
    filename = models.CharField(null=False, blank=False, max_length=100)
    # file type if known
    filetype = models.CharField(null=True, blank=True, max_length=100)
    # direction of the connection, either an input or an output
    direction = models.CharField(null=False, blank=False,
                                 choices=WORKFLOW_NODE_CONNECTION_TYPES,
                                 max_length=3)
    # flag to indicate if file is a file that will (for outputs) or does (for
    # inputs) exist in Refinery
    is_refinery_file = models.BooleanField(null=False, blank=False,
                                           default=False)

    def __unicode__(self):
        return (
            self.direction + ": " +
            str(self.step) + "_" +
            self.name + " (" + str(self.is_refinery_file) + ")"
        )


class Download(TemporaryResource, OwnableResource):
    data_set = models.ForeignKey(DataSet)
    analysis = models.ForeignKey(Analysis, default=None, null=True)
    file_store_item = models.ForeignKey(FileStoreItem, default=None, null=True)

    class Meta:
        verbose_name = "download"
        permissions = (
            ('read_%s' % verbose_name, 'Can read %s' % verbose_name),
        )


def get_shared_groups(user1, user2, include_public_group=False):
    """returns a list of extended groups of which both users are a member"""
    shared_groups = list(set(user1.groups.all()) & set(user2.groups.all()))

    if not include_public_group:
        return filter(
            lambda eg: eg != ExtendedGroup.objects.public_group(),
            [g.extendedgroup for g in shared_groups]
        )

    return [g.extendedgroup for g in shared_groups]


class ExtendedGroupManager(models.Manager):
    def public_group(self):
        try:
            return ExtendedGroup.objects.get(
                id=settings.REFINERY_PUBLIC_GROUP_ID
            )
        except:
            return None


class ExtendedGroup(Group):
    """Extends the default Django Group in auth with a group of users that own
    and manage manageable resources for the group.
    """
    manager_group = models.ForeignKey(
        "self",
        related_name="managed_group",
        blank=True,
        null=True
    )
    uuid = UUIDField(unique=True, auto=True)
    objects = ExtendedGroupManager()
    is_public = models.BooleanField(default=False, blank=False, null=False)
    # Dynamically generated for API.
    member_list = []
    perm_list = []
    can_edit = False
    manager_group_uuid = None

    def delete(self):
        if self.is_manager_group():
            for i in self.managed_group.all():
                i.group_ptr.delete()

            super(ExtendedGroup, self).delete()
        else:
            # Somehow not the only managed group. Shouldn't be possible.
            if self.manager_group.managed_group.count() > 1:
                super(ExtendedGroup, self).delete()
            else:
                # Recursive call.
                self.manager_group.delete()

    def is_managed(self):
        return (self.manager_group is not None)

    # Sometimes easier to rationalize this way because avoids passive voice.
    def is_manager_group(self):
        return not self.is_managed()

    def get_managed_group(self):
        try:
            return (self.managed_group.all()[0])
        except:
            return None


# automatic creation of a managed group when an extended group is created:
def create_manager_group(sender, instance, created, **kwargs):
    if (created and instance.manager_group is None and
            not instance.name.startswith(".Managers ")):
        # create the manager group for the newly created group
        # (but don't create manager groups for manager groups ...)
        post_save.disconnect(create_manager_group, sender=ExtendedGroup)
        instance.manager_group = ExtendedGroup.objects.create(
            name=unicode(".Managers " + instance.uuid)
        )
        instance.save()
        instance.manager_group.save()
        post_save.connect(create_manager_group, sender=ExtendedGroup)


post_save.connect(create_manager_group, sender=ExtendedGroup)


class NodeGroup(SharableResource, TemporaryResource):
    """A collection of Nodes representing data files.
    Used to save selection state between sessions and to map data files to
    workflow inputs.
    """

    #: Number of nodes in the NodeSet (provided in POST/PUT/PATCH requests)
    node_count = models.IntegerField(default=0)
    #: Implicit node is created "on the fly" to support an analysis while
    #: explicit node is created by the user to store a particular selection
    is_implicit = models.BooleanField(default=False)
    study = models.ForeignKey(Study)
    assay = models.ForeignKey(Assay)
    # The "current selection" node set for the associated study/assay
    is_current = models.BooleanField(default=False)
    # Nodes in the group, using uuids are foreign-key
    nodes = models.ManyToManyField(Node, blank=True,
                                   null=True)

    class Meta:
        unique_together = ["assay", "name"]
        verbose_name = "node group"
        permissions = (
            ('read_%s' % verbose_name, 'Can read %s' % verbose_name),
            ('share_%s' % verbose_name, 'Can share %s' % verbose_name),
        )

    def __unicode__(self):
        return (
            self.name + ("*" if self.is_current else "") + " - " +
            self.get_owner_username()
        )


class NodeSet(SharableResource, TemporaryResource):
    """A collection of Nodes representing data files.
    Used to save selection state between sessions and to map data files to
    workflow inputs.
    """
    # Solr query representing a list of Nodes
    solr_query = models.TextField(blank=True, null=True)
    # components of Solr query representing a list of Nodes (required to
    # restore query object in JavaScript client)
    solr_query_components = models.TextField(blank=True, null=True)
    #: Number of nodes in the NodeSet (provided in POST/PUT/PATCH requests)
    node_count = models.IntegerField(blank=True, null=True)
    #: Implicit node is created "on the fly" to support an analysis while
    #: explicit node is created by the user to store a particular selection
    is_implicit = models.BooleanField(default=False)
    study = models.ForeignKey(Study)
    assay = models.ForeignKey(Assay)
    # is this the "current selection" node set for the associated study/assay?
    is_current = models.BooleanField(default=False)

    class Meta:
        verbose_name = "nodeset"
        permissions = (
            ('read_%s' % verbose_name, 'Can read %s' % verbose_name),
            ('share_%s' % verbose_name, 'Can share %s' % verbose_name),
        )

    def __unicode__(self):
        return (
            self.name + ("*" if self.is_current else "") + " - " +
            self.get_owner_username()
        )


def get_current_node_set(study_uuid, assay_uuid):
    """Retrieve current node set. Create current node set if does not exist"""
    node_set = None

    try:
        node_set = NodeSet.objects.get_or_create(
            study__uuid=study_uuid,
            assay__uuid=assay_uuid,
            is_implicit=True,
            is_current=True
        )
    except NodeSet.MultipleObjectsReturned as e:
        logger.error("%s for %s/assay/%s", e, study_uuid, assay_uuid)
    finally:
        return node_set


@transaction.commit_manually()
def create_nodeset(name, study, assay, summary='', solr_query='',
                   solr_query_components=''):
    """Create a new NodeSet.
    :param name: name of the new NodeSet.
    :type name: str.
    :param study: Study model instance.
    :type study: Study.
    :param study: Assay model instance.
    :type study: Assay.
    :param summary: description of the new NodeSet.
    :type summary: str.
    :param solr_query: Solr query representing a list of Node instances.
    :type solr_query: str.
    :param solr_query_components: JSON stringyfied representation of components
        of Solr query representing a list of Node instances.
    :type solr_query_components: str.
    :returns: NodeSet -- new instance.
    :raises: IntegrityError, ValueError
    """
    try:
        nodeset = NodeSet.objects.create(
            name=name,
            study=study,
            assay=assay,
            summary=summary,
            solr_query=solr_query,
            solr_query_components=solr_query_components
        )
    except (IntegrityError, ValueError) as e:
        transaction.rollback()
        logger.error("Failed to create NodeSet: {}".format(e.message))
        raise
    transaction.commit()
    logger.info("NodeSet created with UUID '{}'".format(nodeset.uuid))
    return nodeset


def get_nodeset(uuid):
    """Retrieve a NodeSet given its UUID.
    :param uuid: NodeSet UUID.
    :type uuid: str.
    :returns: NodeSet -- instance that corresponds to the given UUID.
    :raises: DoesNotExist
    """
    try:
        return NodeSet.objects.get(uuid=uuid)
    except NodeSet.DoesNotExist:
        logger.error(
            "Failed to retrieve NodeSet: UUID '{}' does not exist".format(uuid)
        )
        raise


def update_nodeset(uuid, name=None, summary=None, study=None, assay=None,
                   solr_query=None, solr_query_components=None):
    """Replace data in an existing NodeSet with the provided data.
    :param uuid: NodeSet UUID.
    :type uuid: str.
    :param name: new NodeSet name.
    :type name: str.
    :param summary: new NodeSet description.
    :type summary: str.
    :param study: Study model instance.
    :type study: Study.
    :param assay: Assay model instance.
    :type assay: Assay.
    :param solr_query: new Solr query.
    :type solr_query: str.
    :raises: DoesNotExist
    """
    try:
        nodeset = get_nodeset(uuid=uuid)
    except NodeSet.DoesNotExist:
        logger.error(
            "Failed to update NodeSet: UUID '{}' does not exist".format(uuid)
        )
        raise
    if name is not None:
        nodeset.name = name
    if summary is not None:
        nodeset.summary = summary
    if study is not None:
        nodeset.study = study
    if assay is not None:
        nodeset.assay = assay
    if solr_query is not None:
        nodeset.solr_query = solr_query
    if solr_query_components is not None:
        nodeset.solr_query_components = solr_query_components
    nodeset.save()


def delete_nodeset(uuid):
    """Delete a NodeSet specified by UUID.
    :param uuid: NodeSet UUID.
    :type uuid: str.
    """
    NodeSet.objects.filter(uuid=uuid).delete()


class NodePair(models.Model):
    """Linking of specific node relationships for a given node relationship"""
    uuid = UUIDField(unique=True, auto=True)
    #: specific file node
    node1 = models.ForeignKey(Node,
                              related_name="node1")
    #: connected file node
    node2 = models.ForeignKey(Node,
                              related_name="node2", blank=True,
                              null=True)
    # defines a grouping of node relationships i.e. replicate
    group = models.IntegerField(blank=True, null=True)


class NodeRelationship(BaseResource):
    """A collection of Nodes NodePair, representing connections between data
    files, i.e. input/chip pairs. Used to define a collection of connections
    between data files for a specified data set.
    """
    #: must refer to type from noderelationshiptype
    type = models.CharField(max_length=15, choices=NR_TYPES, blank=True)
    #: references multiple nodepair relationships
    node_pairs = models.ManyToManyField(NodePair, related_name='node_pairs',
                                        blank=True, null=True)
    #: references node_sets that were used to determine this relationship
    node_set_1 = models.ForeignKey(NodeSet, related_name='node_set_1',
                                   blank=True, null=True)
    node_set_2 = models.ForeignKey(NodeSet, related_name='node_set_2',
                                   blank=True, null=True)
    study = models.ForeignKey(Study)
    assay = models.ForeignKey(Assay)
    # is this the "current mapping" node set for the associated study/assay?
    is_current = models.BooleanField(default=False)

    def __unicode__(self):
        return (
            self.name + ("*" if self.is_current else "") + " - " +
            str(self.study.title)
        )


def get_current_node_relationship(study_uuid, assay_uuid):
    """Retrieve current node relationship. Create current node relationship if
    does not exist.
    """
    relationship = None

    try:
        relationship = NodeRelationship.objects.get_or_create(
            study__uuid=study_uuid,
            assay__uuid=assay_uuid,
            is_current=True
        )
    except NodeSet.MultipleObjectsReturned as e:
        logger.error("%s for %s/assay/%s", e, study_uuid, assay_uuid)
    finally:
        return relationship


class RefineryLDAPBackend(LDAPBackend):
    """Custom LDAP authentication class"""

    def get_or_create_user(self, username, ldap_user):
        """Send a welcome email to new users"""
        (user, created) = super(RefineryLDAPBackend, self).get_or_create_user(
            username,
            ldap_user
        )
        # the fields in the new User instance are not populated yet, so need
        # to get email address from an attribute in ldap_user
        if created:
            try:
                email_attr_name = settings.AUTH_LDAP_USER_ATTR_MAP['email']
            except KeyError:
                logger.error(
                    "Cannot send welcome email to user '%s': key 'email' does "
                    "not exist in AUTH_LDAP_USER_ATTR_MAP settings variable",
                    username
                )
                return user, created
            try:
                email_address_list = ldap_user.attrs.data[email_attr_name]
            except KeyError:
                logger.error(
                    "Cannot send welcome email to user '%s': attribute '%s'"
                    " was not provided by the LDAP server",
                    username, email_attr_name
                )
                return user, created
            try:
                send_mail(settings.REFINERY_WELCOME_EMAIL_SUBJECT,
                          settings.REFINERY_WELCOME_EMAIL_MESSAGE,
                          settings.DEFAULT_FROM_EMAIL, email_address_list)
            except smtplib.SMTPException as exc:
                logger.error(
                    "Cannot send welcome email to: %s: SMTP server error: %s",
                    email_address_list, exc
                )
            except socket.error as exc:
                logger.error(
                    "Cannot send welcome email to: %s: %s",
                    email_address_list, exc
                )
        return user, created


class ResourceStatistics(object):
    def __init__(
            self,
            user=0,
            group=0,
            files=0,
            dataset=None,
            workflow=None,
            project=None):
        self.user = user
        self.group = group
        self.files = files
        self.dataset = dataset
        self.workflow = workflow
        self.project = project


class GroupManagement(object):
    def __init__(
            self,
            group_id=None,
            group_name=None,
            member_list=None,
            perm_list=None,
            can_edit=False,
            is_manager_group=False,
            manager_group_id=None):
        self.group_id = group_id
        self.group_name = group_name
        self.member_list = member_list
        self.perm_list = perm_list
        self.can_edit = can_edit
        self.is_manager_group = is_manager_group
        self.manager_group_id = manager_group_id


class UserAuthentication(object):
    def __init__(
            self,
            is_logged_in=None,
            is_admin=None,
            id=None,
            username=None):
        self.is_logged_in = is_logged_in
        self.is_admin = is_admin
        self.id = id
        self.username = username


class Invitation(models.Model):
    token_uuid = UUIDField(unique=True, auto=True)
    group_id = models.IntegerField(blank=True, null=True)
    created = models.DateTimeField(editable=False, null=True)
    expires = models.DateTimeField(editable=False, null=True)
    sender = models.ForeignKey(User, null=True)
    recipient_email = models.CharField(max_length=250, null=True)

    def __unicode__(self):
        return self.token_uuid + ' | ' + str(self.group_id)

    def save(self, *arg, **kwargs):
        if not self.id:
            self.created = timezone.now()
        return super(Invitation, self).save(*arg, **kwargs)


# TODO - Back this with DB as a models.Model
class FastQC(object):
    def __init__(self, data=None):
        self.data = data


@receiver(post_save, sender=User)
@skip_if_test_run
def _add_user_to_neo4j(sender, **kwargs):
    user = kwargs['instance']

    add_or_update_user_to_neo4j(user.id, user.username)
    add_read_access_in_neo4j(
        map(
            lambda ds: ds.uuid, get_objects_for_group(
                ExtendedGroup.objects.public_group(),
                'core.read_dataset'
            )
        ),
        [user.id]
    )
    update_annotation_sets_neo4j(user.username)


@receiver(pre_delete, sender=User)
def _delete_user_from_neo4J(sender, instance, *args, **kwargs):
    delete_user_in_neo4j(instance.id, instance.username)


class Ontology(models.Model):
    """Store meta information of imported ontologies
    """

    # Stores the most recent import date, i.e. this will be overwritten when a
    # ontology is re-imported.
    import_date = models.DateTimeField(
        default=timezone.now,
        editable=False,
        auto_now=False
    )

    # Full name of the ontology
    # E.g.: Gene Ontology
    name = models.CharField(max_length=64, blank=True)

    # Equals the abbreviation / acronym / prefix specified during the import.
    # Note that prefix constist of uppercase letters only. Similar to the OBO
    # naming convention.
    # E.g.: GO
    acronym = models.CharField(max_length=8, blank=True, unique=True)

    # Base URI of the ontology
    # E.g.: http://purl.obolibrary.org/obo/go.owl
    uri = models.CharField(max_length=128, blank=True, unique=True)

    # Stores the most recent date when the model was updated in whatever way.
    update_date = models.DateTimeField(auto_now=True)

    # Stores the versionIRI of the ontology. Can be useful to check which
    # version is currently imported.
    version = models.CharField(
        max_length=256,
        null=True,
        blank=True
    )

    # Stores the version of Owl2Neo4J. This can be helpful to figure out which
    # ontology needs a re-import when the parser changed dramatically
    owl2neo4j_version = models.CharField(
        max_length=16,
        null=True
    )

    def __unicode__(self):
        return '{name} ({acronym})'.format(
            name=self.name,
            acronym=self.acronym
        )


@receiver(pre_delete, sender=Ontology)
def _ontology_delete(sender, instance, *args, **kwargs):
    delete_ontology_from_neo4j(instance.acronym)


# http://web.archive.org/web/20140826013240/http://codeblogging.net/blogs/1/14/
def get_subclasses(classes, level=0):
    """
        Return the list of all subclasses given class (or list of classes) has.
        Inspired by this question:
        http://stackoverflow.com/questions/3862310/how-can-i-find-all-
        subclasses-of-a-given-class-in-python
    """
    # for convenience, only one class can can be accepted as argument
    # converting to list if this is the case
    if not isinstance(classes, list):
        classes = [classes]

    if level < len(classes):
        classes += classes[level].__subclasses__()
        return get_subclasses(classes, level + 1)
    else:
        return classes


def receiver_subclasses(signal, sender, dispatch_uid_prefix, **kwargs):
    """
    A decorator for connecting receivers and all receiver's subclasses to
    signals. Used by passing in the signal and keyword arguments to connect::
        @receiver_subclasses(post_save, sender=MyModel)
        def signal_receiver(sender, **kwargs):
            ...
    """

    def _decorator(func):
        all_senders = get_subclasses(sender)
        for snd in all_senders:
            signal.connect(
                func, sender=snd, dispatch_uid=dispatch_uid_prefix + '_' +
                snd.__name__, **kwargs)
        return func

    return _decorator


@receiver_subclasses(post_delete, BaseResource, "baseresource_post_delete")
def _baseresource_delete(sender, instance, **kwargs):
    '''
        Handles the invalidation of cached objects that inherit from
        BaseResource after being deleted
    '''
    invalidate_cached_object(instance)


@receiver_subclasses(post_save, BaseResource, "baseresource_post_save")
def _baseresource_save(sender, instance, **kwargs):
    '''
        Handles the invalidation of cached objects that inherit from
        BaseResource after being saved
    '''
    invalidate_cached_object(instance)


@receiver_subclasses(pre_delete, NodeCollection,
                     "nodecollection_pre_delete")
def _nodecollection_delete(sender, instance, **kwargs):
    '''
        This finds all subclasses related to a DataSet's NodeCollections and
        handles the deletion of all FileStoreItems related to the DataSet
    '''
    nodes = Node.objects.filter(study=instance)
    for node in nodes:
        try:
            FileStoreItem.objects.get(uuid=node.file_uuid).delete()
        except Exception as e:
            logger.debug("Could not delete FileStoreItem:%s" % str(e))


class AuthenticationFormUsernameOrEmail(AuthenticationForm):
    def clean_username(self):
        username = self.data['username']
        if '@' in username:
            try:
                username = User.objects.get(email=username).username
            except User.DoesNotExist as e:
                logger.error("Could not login with email %s, error: %s",
                             username, e)
                raise ValidationError(
                    'The email entered does not belong to any user account. '
                    'Please check for typos or register below.',
                    code='invalid_login',
                    params={'username': self.username_field.verbose_name},
                )
            except User.MultipleObjectsReturned as e:
                logger.error("Duplicate registration with email %s, error: "
                             "%s", username, e)
                raise ValidationError(
                    'You have registered twice with the same email. Hence, ' +
                    'we don\'t know under which user you want to log in. ' +
                    'Please specify your username.',
                    code='invalid_login',
                    params={'username': self.username_field.verbose_name},
                )
        return username


class CustomRegistrationManager(RegistrationManager):
    def custom_create_inactive_user(self, username, email, password,
                                    site, first_name, last_name,
                                    affiliation, send_email=True):
        """
        Create a new, inactive ``User``, generate a
        ``CustomRegistrationProfile`` and email its activation key to the
        "Admin" User, returning the new ``User``.

        By default, an activation email will be sent to the Admin. To disable
        this, pass ``send_email=False``.

        """
        new_user = User.objects.create_user(username, email, password)
        new_user.is_active = False

        # Adding custom fields
        new_user.first_name = first_name
        new_user.last_name = last_name
        new_user.save()

        try:
            new_user_profile = UserProfile.objects.get(user=new_user.id)
        except (UserProfile.DoesNotExist,
                UserProfile.MultipleObjectsReturned) as e:
            logger.error("Error while fetching Userprofile: %s" % e)

        if new_user_profile:
            new_user_profile.affiliation = affiliation
            new_user_profile.save()
            new_user.profile = new_user_profile

        registration_profile = self.create_profile(new_user)

        if send_email:
            registration_profile.custom_send_activation_email(site)

        return new_user

    create_inactive_user = transaction.commit_on_success(
        custom_create_inactive_user)


class CustomRegistrationProfile(RegistrationProfile):
    objects = CustomRegistrationManager()

    def custom_send_activation_email(self, site):
        """
        Send a custom activation email to the "Admin" user.

        The activation email will make use of two templates:

        ``registration/activation_email_subject.txt``
            This template will be used for the subject line of the
            email. Because it is used as the subject line of an email,
            this template's output **must** be only a single line of
            text; output longer than one line will be forcibly joined
            into only a single line.

        ``registration/activation_email.txt``
            This template will be used for the body of the email.

        These templates will each receive the following context
        variables:

        ``activation_key``
            The activation key for the new account.

        ``expiration_days``
            The number of days remaining during which the account may
            be activated.

        ``site``
            An object representing the site on which the user
            registered; depending on whether ``django.contrib.sites``
            is installed, this may be an instance of either
            ``django.contrib.sites.models.Site`` (if the sites
            application is installed) or
            ``django.contrib.sites.models.RequestSite`` (if
            not). Consult the documentation for the Django sites
            framework for details regarding these objects' interfaces.


        ``registered_user_email``
            The email address of the User who jsut registered

        ``registered_user_username``
            The username of the User who just registered


        """
        ctx_dict = {'activation_key': self.activation_key,
                    'expiration_days': settings.ACCOUNT_ACTIVATION_DAYS,
                    'site': site.domain,
                    'registered_user_email': self.user.email,
                    'registered_user_username': self.user.username,
                    'registered_user_full_name': "{} {}".format(
                        self.user.first_name, self.user.last_name),
                    'registered_user_affiliation':
                        self.user.profile.affiliation

                    }
        subject = render_to_string('registration/activation_email_subject.txt',
                                   ctx_dict)
        # Email subject *must not* contain newlines
        subject = ''.join(subject.splitlines())

        message = render_to_string('registration/activation_email.txt',
                                   ctx_dict)

        # Email the admin of this instance
        email_admin(subject, message)

        logger.info(
            "An email has been sent to admins informing of registration of  "
            "user %s", self.user
        )
