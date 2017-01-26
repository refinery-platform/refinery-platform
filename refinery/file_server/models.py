'''
Created on Apr 21, 2012

'''

import json
import logging

from django.db import models, transaction
from django.db.utils import IntegrityError

import file_server.tdf_file as tdf_module
import file_store.models as fs_models

logger = logging.getLogger('file_server')

# list of lowercase names of file server models
# (update if new models are added)
FILE_SERVER_MODELS = ('tdfitem', 'bamitem', 'wigitem', 'bigbeditem')
# TODO: get names of all classes derived from _FileServerItem automatically


class _FileServerItemManager(models.Manager):
    """Custom model manager to handle retrieval of _FileServerItems"""
    def get_item(self, uuid):
        """Handles potential exceptions when retrieving a _FileServerItem
        :param uuid: UUID of the data_file of a _FileServerItem.
        :type uuid: str.
        :returns: _FileServerItem -- model instance if exactly one match is
        found, None otherwise.
        """
        try:
            item = _FileServerItem.objects.get(data_file__uuid=uuid)
        except _FileServerItem.DoesNotExist:
            logger.warn(
                "_FileServerItem with data_file UUID '%s' does not exist",
                uuid)
            return None
        except _FileServerItem.MultipleObjectsReturned:
            logger.warn("More than one _FileServerItem matched UUID '%s'",
                        uuid)
            return None

        return item


class _FileServerItem(models.Model):
    """Private base class representing files required for visualization.
    Do not use directly.  Use derived models instead.
    """
    # TODO: raise NotImplemented exception in all abstract methods
    data_file = models.ForeignKey(fs_models.FileStoreItem, unique=True)
    objects = _FileServerItemManager()

    def initialize(self):
        """Prepare the model instance to be used for visualization.
        A placeholder method to be overridden by subclasses.
        """
        logger.error(
            "Cannot initialize _FileServerItem with data file UUID '%s'",
            self.data_file.uuid)
        return False

    def get_contents(self):
        """Return information about internal structure of the visualization
        file. A placeholder method to be overridden by subclasses.
        """
        logger.error("_FileServerItem with data file UUID '%s' "
                     "does not report contents", self.data_file.uuid)
        return False

    def get_profile(self, *args, **kwargs):
        """Report information about internal structure.
        A placeholder method to be overridden by subclasses.
        """
        logger.error("_FileServerItem with data file UUID '%s' "
                     "does not return profiles", self.data_file.uuid)
        return False

    def get_file_object(self):
        """Return visualization file object appropriate for this file type.
        A placeholder method to be overridden by subclasses.
        """
        logger.error("_FileServerItem with data file UUID '%s' "
                     "does not return file objects", self.data_file.uuid)
        return False

    def get_aux_file_item(self):
        """Get aux file item if exists
        A placeholder method to be overridden by subclasses.
        """


class TDFItem(_FileServerItem):
    """Represents a TDF file that is not linked to a data file"""
    def __unicode__(self):
        return self.data_file.uuid

    def get_profile(self, seq, zoom, window, start, end):
        """Calculates and returns a profile.
        :param seq: Sequence name.
        :type seq: str.
        :param zoom: Zoom level.
        :type zoom: int.
        :param window: Window function.
        :type window: str.
        :param start: Start position.
        :type start: int.
        :param end: End position.
        :type end: int.
        :returns: JSON
        """
        with self.get_file_object() as file_object:
            tdf_file = tdf_module.TDFFile(file_object)
            tdf_file.cache()
            profile = tdf_file.get_profile(seq, zoom, window, start, end)
        return json.dumps(profile)

    def get_file_object(self):
        """Return the TDF file object.
        :returns: file object or None if it's not available.
        """
        return self.data_file.get_file_object()


class BigBEDItem(_FileServerItem):
    """Represents a BigBED file."""
    def __unicode__(self):
        return self.data_file.uuid

    def get_file_object(self):
        """Return the TDF file object.
        :returns: file object or None if it's not available.
        """
        return self.data_file.get_file_object()


class BAMItem(_FileServerItem):
    """Represents a BAM file and optionally links it to an index file and a
    TDF file.
    """
    #: BAM file index
    index_file = models.ForeignKey(fs_models.FileStoreItem, blank=True,
                                   null=True,
                                   related_name="bamitem_index_file")
    #: Visualization file
    tdf_file = models.ForeignKey(fs_models.FileStoreItem, blank=True,
                                 null=True, related_name="bamitem_tdf_file")
    # related_name is required to avoid naming clashes in reverse relationships
    # http://stackoverflow.com/q/5180729

    def __unicode__(self):
        if self.tdf_file:
            return self.data_file.uuid + ' - ' + self.tdf_file.uuid
        else:
            return self.data_file.uuid

    def initialize(self):
        """Create a TDF file from BAM file"""

    def get_contents(self):
        """Get information about the data file.
        :returns: JSON
        """
        pass

    def get_profile(self, seq, zoom, window, start, end):
        """Calculate a profile from the TDF file.
        :param seq: Sequence name.
        :type seq: str.
        :param zoom: Zoom level.
        :type zoom: int.
        :param window: Window function.
        :type window: str.
        :param start: Start position.
        :type start: int.
        :param end: End position.
        :type end: int.
        :returns: JSON
        """
        with self.get_file_object() as file_object:
            tdf_file = tdf_module.TDFFile(file_object)
            tdf_file.cache()
            profile = tdf_file.get_profile(seq, zoom, ["mean"], start, end)
        return json.dumps(profile)

    def get_file_object(self):
        """Return the TDF file object.
        :returns: file object or None if it's not available.
        """
        return self.tdf_file.get_file_object()

    def update(self, tdf_uuid):
        """Associate the BAM file with a new TDF file.
        :param tdf_uuid: UUID of the TDF file.
        :type tdf_uuid: str.
        :returns: bool -- True if update succeeded, False if failed.
        """
        logger.debug("Updating BAMItem using TDF UUID '%s'", tdf_uuid)

        item = fs_models.FileStoreItem.objects.get_item(uuid=tdf_uuid)
        if item:
            self.tdf_file = item
            try:
                self.save()
            except IntegrityError as e:
                logger.error("Failed updating BAMItem\n%s", e.message)
                return False
        else:
            logger.error("Failed updating BAMItem")
            return False

        logger.info("BAMItem updated")
        return True

    def get_aux_file_item(self):
        """Get aux file item"""
        return self.tdf_file


class WIGItem(_FileServerItem):
    """Represents a WIG file and optionally links it to a TDF file"""
    #: Visualization file
    tdf_file = models.ForeignKey(fs_models.FileStoreItem, blank=True,
                                 null=True)

    def __unicode__(self):
        if self.tdf_file:
            return self.data_file.uuid + ' - ' + self.tdf_file.uuid
        else:
            return self.data_file.uuid

    def initialize(self):
        """Create a TDF file from WIG file"""

    def get_contents(self):
        """Get information about the WIG file.
        :returns: JSON
        """
        pass

    def get_profile(self, zoom, seq, window, start, end):
        """Calculates and returns a profile from TDF file.
        :param seq: Sequence name.
        :type seq: str.
        :param zoom: Zoom level.
        :type zoom: int.
        :param window: Window function.
        :type window: str.
        :param start: Start position.
        :type start: int.
        :param end: End position.
        :type end: int.
        :returns: JSON
        """
        with self.get_file_object() as file_object:
            tdf_file = tdf_module.TDFFile(file_object)
            tdf_file.cache()
            profile = tdf_file.get_profile(seq, zoom, ["mean"], start, end)
        return json.dumps(profile)

    def get_file_object(self):
        """Return the TDF file object.
        :returns: file object or None if it's not available.
        """
        return self.tdf_file.get_file_object()

    def update(self, tdf_uuid):
        """Associate the WIG file with a new TDF file.
        :param tdf_uuid: UUID of the TDF file.
        :type tdf_uuid: str.
        :returns: bool -- True if update succeeded, False if failed.
        """
        logger.debug("Updating WIGItem '%s' using TDF UUID '%s'",
                     self.data_file.uuid, tdf_uuid)

        item = fs_models.FileStoreItem.objects.get_item(uuid=tdf_uuid)
        if item:
            self.tdf_file = item
            try:
                self.save()
            except IntegrityError as e:
                logger.error("WIGItem update failed: {}".format(e.message))
                return False
        else:
            logger.error("WIGItem update failed: "
                         "FileStoreItem '%s' does not exist", tdf_uuid)
            return False

        logger.info("Updated WIGItem '{}'".format(self.data_file_file.uuid))
        return True

    def get_aux_file_item(self):
        """Get aux file item"""
        return self.tdf_file


def add(data_file_uuid, aux_file_uuid=None):
    """Create a file server item of an appropriate type.
    :param data_file_uuid: UUID of a data file.
    :type data_file_uuid: str.
    :param aux_file_uuid: UUID of an auxiliary file.
    :type aux_file_uuid: str.
    :returns: instance of a _FileServerItem subclass or None if there was an
    error.
    """
    data_file = fs_models.FileStoreItem.objects.get_item(uuid=data_file_uuid)
    if not data_file:
        logger.error("Could not create _FileServerItem: "
                     "FileServerItem UUID '%s' doesn't exist", data_file_uuid)
        return None

    file_type = data_file.get_filetype()
    if file_type == fs_models.FileExtension.objects.get(name="tdf").filetype:
        return _add_tdf(data_file=data_file)
    elif file_type == fs_models.FileExtension.objects.get(name="bam").filetype:
        return _add_bam(data_file=data_file, tdf_file_uuid=aux_file_uuid)
    elif file_type == fs_models.FileExtension.objects.get(name="wig").filetype:
        return _add_wig(data_file=data_file, tdf_file_uuid=aux_file_uuid)
    elif file_type == fs_models.FileExtension.objects.get(name="bb").filetype:
        return _add_bigbed(data_file=data_file)
    else:
        logger.error("Could not create _FileServerItem: "
                     "unknown file type '%s'", file_type)
        return None


def get(data_file_uuid):
    """Returns an instance of a _FileServerItem subclass that has a data_file
    with the specified UUID.
    :param uuid: UUID of a data file.
    :type uuid: str.
    :returns: instance of a _FileServerItem subclass or None if not found.
    """
    item = _FileServerItem.objects.get_item(uuid=data_file_uuid)
    # return appropriate model instance by iterating over list of available
    # model names
    if item:
        for model in FILE_SERVER_MODELS:
            if hasattr(item, model):
                return getattr(item, model)
    return None


def delete(data_file_uuid):
    """Deletes an instance of a FileServerItem subclass that has a data_file
    with the specified UUID.
    :param uuid: UUID of a data file.
    :type uuid: str.
    :returns: bool -- True if success, False if failure.
    """
    logger.debug("Deleting _FileServerItem with data file UUID '%s'",
                 data_file_uuid)
    item = _FileServerItem.objects.get_item(data_file_uuid)
    if item:
        item.delete()
        logger.info("_FileServerItem deleted")
        return True
    else:
        logger.error("Could not delete _FileServerItem with data file UUID "
                     "'%s'", data_file_uuid)
        return False


def initialize(data_file_uuid):
    """Prepare the model instance to be used for visualization.
    :param data_file_uuid: UUID of a data file.
    :type data_file_uuid: str.
    :returns: instance of _FileServerItem subclass or None if there was an
    error.
    """
    item = get(data_file_uuid)
    if item:
        if item.initialize():
            return item
        else:
            logger.error("Initialization failed")
            return None
    else:
        logger.error("_FileServerItem with data file UUID '%s' does not exist",
                     data_file_uuid)
        return None


def get_aux_file_item(data_file_uuid):
    """Get auxiliary file item given primary file item UUID
    :param data_file_uuid: UUID of a data file
    :type data_file_uuid: str.
    :returns: instance of FileStoreItem or None.
    """
    item = get(data_file_uuid)
    if item:
        return item.get_aux_file_item()
    else:
        return None


@transaction.commit_manually()
def _add_tdf(data_file):
    """Create a new TDFItem instance.
    :param data_file: TDF file instance.
    :type data_file: file_store.models.FileStoreItem.
    :returns: TDFItem -- newly created TDFItem model instance or None if there
    was an error.
    """
    # create TDFItem instance
    try:
        item = TDFItem.objects.create(data_file=data_file)
    except (IntegrityError, ValueError) as e:
        transaction.rollback()
        logger.error("Failed to create TDFItem: %s", e.message)
        return None

    transaction.commit()
    logger.info("TDFItem created with UUID '%s'", item.data_file.uuid)
    return item


@transaction.commit_manually()
def _add_bigbed(data_file):
    """Create a new BigBEDItem instance.
    :param data_file: BigBED file instance.
    :type data_file: file_store.models.FileStoreItem.
    :returns: BigBEDItem -- newly created BigBEDItem model instance or None if
    there was an error.
    """
    try:
        item = BigBEDItem.objects.create(data_file=data_file)
    except (IntegrityError, ValueError) as e:
        transaction.rollback()
        logger.error("Failed to create BigBEDItem: %s", e.message)
        return None

    transaction.commit()
    logger.info("BigBEDItem created with UUID '%s'", item.data_file.uuid)
    return item


@transaction.commit_manually
def _add_bam(data_file, tdf_file_uuid=None):
    """Create a new BAMItem instance.
    Manual transaction control is required when using PostgreSQL and save() or
    create() raise an exception:
    https://docs.djangoproject.com/en/dev/topics/db/transactions/#handling-exceptions-within-postgresql-transactions
    :param data_file: BAM file instance.
    :type data_file: file_store.models.FileStoreItem.
    :param tdf_file_uuid: UUID of the TDF file.
    :type tdf_file_uuid: str.
    :returns: BAMItem -- newly created BAMItem model instance or None if there
    was an error.
    """
    if tdf_file_uuid:
        tdf_file = fs_models.FileStoreItem.objects.get_item(tdf_file_uuid)
    else:
        tdf_file = None
        logger.debug("TDF file UUID was not provided")
    # create BAMItem instance
    try:
        item = BAMItem.objects.create(data_file=data_file, tdf_file=tdf_file)
    except (IntegrityError, ValueError) as e:
        transaction.rollback()
        logger.error("Failed to create BAMItem: %s", e.message)
        return None

    transaction.commit()
    logger.info("BAMItem created")
    return item


@transaction.commit_manually
def _add_wig(data_file, tdf_file_uuid=None):
    """Create a new WIGItem instance.
    Manual transaction control is required when using PostgreSQL and save() or
    create() raise an exception:
    https://docs.djangoproject.com/en/dev/topics/db/transactions/#handling-exceptions-within-postgresql-transactions
    :param data_file: WIG file instance.
    :type data_file: file_store.models.FileStoreItem.
    :param tdf_file_uuid: UUID of the TDF file.
    :type tdf_file_uuid: str.
    :returns: WIGItem -- newly created WIGItem model instance or None if there
    was an error.
    """
    # check if we can get the TDF file
    if tdf_file_uuid:
        tdf_file = fs_models.FileStoreItem.objects.get_item(tdf_file_uuid)
    else:
        tdf_file = None
        logger.debug("TDF file UUID was not provided")
    # create WIGItem instance
    try:
        item = WIGItem.objects.create(data_file=data_file, tdf_file=tdf_file)
    except (IntegrityError, ValueError) as e:
        transaction.rollback()
        logger.error("Failed to create WIGItem. %s", e.message)
        return None

    transaction.commit()
    logger.info("WIGItem '{}' created".format(item.data_file.uuid))
    return item
