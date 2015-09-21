'''
Created on Feb 20, 2012

@author: nils
'''
from __future__ import absolute_import
from datetime import datetime
import logging
import os
import smtplib
import socket

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.models import User, Group
from django.contrib.auth.signals import user_logged_in
from django.core.exceptions import MultipleObjectsReturned
from django.core.mail import mail_admins, send_mail
from django.db import models, transaction
from django.db.models import Max
from django.db.models.fields import IntegerField
from django.db.models.signals import post_save, pre_delete
from django.db.utils import IntegrityError
from django.dispatch import receiver

from bioblend import galaxy
from django_extensions.db.fields import UUIDField
from django_auth_ldap.backend import LDAPBackend
from guardian.shortcuts import get_users_with_perms, \
    get_groups_with_perms, assign_perm, remove_perm
from registration.signals import user_registered, user_activated
from data_set_manager.models import Investigation, Node, Study, Assay
from file_store.models import get_file_size, FileStoreItem
from galaxy_connector.models import Instance
from .utils import update_data_set_index, delete_data_set_index, \
    add_read_access_in_neo4j, remove_read_access_in_neo4j


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


class UserProfile (models.Model):
    """Extends Django user model:
    https://docs.djangoproject.com/en/dev/topics/auth/#storing-additional
    -information-about-users
    """
    uuid = UUIDField(unique=True, auto=True)
    user = models.OneToOneField(User)
    affiliation = models.CharField(max_length=100, blank=True)
    catch_all_project = models.ForeignKey('Project', blank=True, null=True)
    is_public = models.BooleanField(default=False, blank=False, null=False)

    def __unicode__(self):
        return (
            self.user.first_name + " " +
            self.user.last_name + " (" +
            self.affiliation + "): " +
            self.user.email
        )


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

post_save.connect(create_user_profile, sender=User)


@receiver(post_save, sender=User)
def add_new_user_to_public_group(sender, instance, created, **kwargs):
    """Add new users to Public group automatically

    """
    if created:
        public_group = ExtendedGroup.objects.public_group()
        # need to check if Public group exists to avoid errors when creating
        # user accounts (like superuser and AnonymousUser) before the group
        # is created by init_refinery command
        if public_group:
            instance.groups.add(public_group)


def create_user_profile_registered(sender, user, request, **kwargs):
    UserProfile.objects.get_or_create(user=user)

    logger.info(
        "user profile for user %s has been created after registration %s",
        user, datetime.now()
    )
    mail_admins(
        'New User Registered', 'User %s registered at %s'
        % (user, datetime.now())
    )
    logger.info(
        "email has been sent to admins informing of registration of user %s",
        user
    )

user_registered.connect(
    create_user_profile_registered,
    dispatch_uid="registered"
)


def register_handler(request, sender, user, **kwargs):
    messages.success(request, 'Thank you!  Your account has been activated.')

user_activated.connect(register_handler, dispatch_uid='activated')


# check if user has a catch all project and create one if not
def create_catch_all_project(sender, user, request, **kwargs):
    if user.get_profile().catch_all_project is None:
        project = Project.objects.create(
            name="Catch-All Project",
            is_catch_all=True
        )
        project.set_owner(user)
        user.get_profile().catch_all_project = project
        user.get_profile().save()
        messages.success(
            request,
            "If you don't want to fill your profile out now, you can go to "
            "the <a href='/'>homepage</a>.",
            extra_tags='safe',
            fail_silently=True
        )   # needed to avoid MessageFailure when running tests

# create catch all project for user if none exists
user_logged_in.connect(create_catch_all_project)


class BaseResource (models.Model):
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


class OwnableResource (BaseResource):
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


class SharableResource (OwnableResource):
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


class TemporaryResource:
    """Mix-in class for temporary resources like NodeSet instances"""
    # Expiration time and date of the instance
    expiration = models.DateTimeField()

    def __unicode__(self):
        return self.name + " (" + self.uuid + ")"

    class Meta:
        abstract = True


class ManageableResource:
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


class DataSet(SharableResource):
    # TODO: add function to restore earlier version
    # TODO: add collections (of assays in the investigation) and associate them
    # with the versions
    # total number of files in this data set
    file_count = models.IntegerField(blank=True, null=True, default=0)
    # total number of bytes of all files in this data set
    file_size = models.BigIntegerField(blank=True, null=True, default=0)
    # accession number (e.g. "E-MTAB-2646")
    accession = models.CharField(max_length=32, blank=True,  null=True)
    # name of source database for the accession number (e.g. "ArrayExpress")
    accession_source = models.CharField(max_length=128, blank=True,  null=True)
    # actual title of the dataset
    title = models.CharField(max_length=250, blank=True,  null=True)

    class Meta:
        verbose_name = "dataset"
        permissions = (
            ('read_%s' % verbose_name, 'Can read %s' % verbose_name),
            ('share_%s' % verbose_name, 'Can share %s' % verbose_name),
        )

    def __unicode__(self):
        return (self.name + " - " +
                self.get_owner_username() + " - " +
                self.summary)

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
            version=version+1,
            message=message
        )
        link.save()
        return version+1

    def get_version(self):
        try:
            version = (
                InvestigationLink.objects
                                 .filter(data_set=self)
                                 .aggregate(Max("version"))["version__max"]
            )
            return version
        except:
            return None

    def get_version_details(self, version=None):
        try:
            if version is None:
                version = (
                    InvestigationLink.objects
                                     .filter(data_set=self)
                                     .aggregate(Max("version"))["version__max"]
                )

            return (
                InvestigationLink.objects
                                 .filter(data_set=self, version=version)
                                 .get()
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
        include_symlinks = True

        for study in investigation.study_set.all():
            files = Node.objects.filter(
                study=study.id, file_uuid__isnull=False).values("file_uuid")
            for file in files:
                size = get_file_size(
                    file["file_uuid"], report_symlinks=include_symlinks)
                file_size += size

        return file_size

    def share(self, group, readonly=True):
        super(DataSet, self).share(group, readonly)
        update_data_set_index(self)
        add_read_access_in_neo4j(self, group)

    def unshare(self, group):
        super(DataSet, self).unshare(group)
        update_data_set_index(self)
        remove_read_access_in_neo4j(self, group)


@receiver(pre_delete, sender=DataSet)
def _dataset_delete(sender, instance, *args, **kwargs):
    delete_data_set_index(instance)


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


class WorkflowDataInput (models.Model):
    name = models.CharField(max_length=200)
    internal_id = models.IntegerField()

    def __unicode__(self):
        return self.name + " (" + str(self.internal_id) + ")"


class WorkflowEngine (OwnableResource, ManageableResource):
    # TODO: remove Galaxy dependency
    instance = models.ForeignKey(Instance, blank=True)

    def __unicode__(self):
        return self.name + " - " + self.summary

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
            self.name + " - Quota: " + str(self.current/(1024*1024*1024)) +
            " of " + str(self.maximum/(1024*1024*1024)) + "GB available"
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

    def __unicode__(self):
        return self.name + " - " + self.summary

    class Meta:
        # unique_together = ('internal_id', 'workflow_engine')
        verbose_name = "workflow"
        permissions = (
            ('read_%s' % verbose_name, 'Can read %s' % verbose_name),
            ('share_%s' % verbose_name, 'Can share %s' % verbose_name),
        )


class Project(SharableResource):
    is_catch_all = models.BooleanField(default=False)

    def __unicode__(self):
        return (
            self.name + " - " + self.get_owner_username() + " - " +
            self.summary
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
    cancel = models.BooleanField(default=False)
    # possibly replace results
    # output_nodes = models.ManyToManyField(Nodes, blank=True)
    # protocol = i.e. protocol node created when the analysis is created

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

    def get_status(self):
        return self.status

    def set_status(self, status, message=''):
        """Set analysis status and perform additional actions as required"""
        self.status = status
        self.status_detail = message
        if status == self.FAILURE_STATUS or status == self.SUCCESS_STATUS:
            self.time_end = datetime.now()
        self.save()

    def failed(self):
        return True if self.status == self.FAILURE_STATUS else False

    def galaxy_connection(self):
        return self.workflow.workflow_engine.instance.galaxy_connection()

    def cleanup(self):
        """Delete library, workflow and history from Galaxy if they exist"""
        connection = self.galaxy_connection()
        error_msg = "Error deleting Galaxy %s for analysis '%s': %s"

        if self.library_id:
            try:
                connection.libraries.delete_library(self.library_id)
            except galaxy.client.ConnectionError as e:
                logger.error(error_msg, 'library', self.name, e.message)

        if self.workflow_galaxy_id:
            try:
                connection.workflows.delete_workflow(self.workflow_galaxy_id)
            except galaxy.client.ConnectionError as e:
                logger.error(error_msg, 'workflow', self.name, e.message)

        if self.history_id:
            try:
                connection.histories.delete_history(
                    self.history_id, purge=True)
            except galaxy.client.ConnectionError as e:
                logger.error(error_msg, 'history', self.name, e.message)

    def cancel(self):
        # mark analysis as canceled
        self.cancel = True
        self.save()
        # jobs in a running workflow are stopped by deleting its history
        self.cleanup()
        self.set_status(Analysis.FAILURE_STATUS, "Cancelled at user's request")


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
    node = models.ForeignKey(Node, related_name="workflow_node_connections",
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

    def save(self, *args, **kwargs):
        if len(self.name) == 0:
            logger.error("Group name cannot be empty.")
            return
        else:
            super(ExtendedGroup, self).save(*args, **kwargs)


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
    is_implicit = models.BooleanField()
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
    except MultipleObjectsReturned:
        logger.error(
            "Multiple current node sets for study " + study_uuid + "/assay " +
            assay_uuid + "."
        )
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
    node1 = models.ForeignKey(Node, related_name="node1")
    #: connected file node
    node2 = models.ForeignKey(Node, related_name="node2", blank=True,
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
    except MultipleObjectsReturned:
        logger.error(
            "Multiple current node relationships for study " + study_uuid +
            "/assay " + assay_uuid + "."
        )
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
            except smtplib.SMTPException:
                logger.error(
                    "Cannot send welcome email to: %s: SMTP server error",
                    email_address_list
                )
            except socket.error as e:
                logger.error(
                    "Cannot send welcome email to: %s: %s",
                    email_address_list, e
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
            self.created = datetime.now()
        return super(Invitation, self).save(*arg, **kwargs)


# TODO - Back this with DB as a models.Model
class FastQC(object):
    def __init__(self, data=None):
        self.data = data
