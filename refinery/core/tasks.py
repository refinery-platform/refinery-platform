import logging

from django.db.models.deletion import Collector
from django.db.models.fields.related import ForeignKey

from celery.task import task

from data_set_manager.models import Investigation, Study
from data_set_manager.tasks import annotate_nodes
from file_store.models import FileStoreItem
from file_store.tasks import import_file

from .models import DataSet, InvestigationLink, SiteStatistics

logger = logging.getLogger(__name__)


def copy_file(original_item_uuid):
    """Creates a copy of a FileStoreItem with the given UUID"""
    try:
        original_item = FileStoreItem.objects.get(uuid=original_item_uuid)
    except (FileStoreItem.DoesNotExist,
            FileStoreItem.MultipleObjectsReturned) as exc:
        logger.error("Failed to copy FileStoreItem with UUID '%s': %s",
                     original_item_uuid, exc)
        return None
    try:
        new_item = FileStoreItem.objects.create(
            source=original_item.source, filetype=original_item.filetype
        )
    except AttributeError:
        return None
    else:
        import_file(new_item.uuid, refresh=True)
        return new_item.uuid


def copy_object(obj, value=None, field=None, duplicate_order=None,
                copy_files=False):
    """Duplicate all related objects of obj setting field to value
    If one of the duplicate objects has an FK to another duplicate object
    update that as well. Return the duplicate copy of obj.
    This code was adapted from http://djangosnippets.org/snippets/1282/
    :param obj: Object to copy.
    :type obj: Model instance of something.
    :param value: value to set.
    :type value: str.
    :param field: field to update.
    :type field: str.
    :param duplicate_order: list of models which specify how the duplicate
    objects are saved. For complex objects this can matter. Check to save if
    objects are being saved correctly and if not just pass in related objects
    in the order that they should be saved.
    :type duplicate_order: list.
    :param copy_files: Flag indicating whether to create a copy of the
    FileStoreItem or simply copy the original FileStoreItem's UUID.
    :type copy_files: bool.
    :returns: copy of Model instance if successful.
    """
    # key = original object, value = copy of original object
    associated_copy = dict()
    collector = Collector("default")
    collector.collect([obj])
    collector.sort()
    related_models = collector.data.keys()
    data_snapshot = {}
    for key in collector.data.keys():
        data_snapshot.update({
            key: dict(zip(
                [item.pk for item in collector.data[key]],
                [item for item in collector.data[key]]
            ))
        })

    root_obj = None

    # Sometimes it's good enough just to save in reverse deletion order
    if duplicate_order is None:
        duplicate_order = reversed(related_models)

    for model in duplicate_order:
        # Find all FKs on model that point to a related_model
        fks = []
        for f in model._meta.fields:
            if isinstance(f, ForeignKey) and f.rel.to in related_models:
                fks.append(f)
        # Replace each `sub_obj` with a duplicate.
        if model not in collector.data:
            continue
        sub_objects = collector.data[model]
        for obj in sub_objects:
            orig_obj_id = obj.id

            for fk in fks:
                fk_value = getattr(obj, "%s_id" % fk.name)
                # If this FK has been duplicated then point to the duplicate.
                fk_rel_to = data_snapshot[fk.rel.to]
                if fk_value in fk_rel_to:
                    dupe_obj = fk_rel_to[fk_value]
                    setattr(obj, fk.name, dupe_obj)

            # Duplicate the object and save it.
            obj.id = None

            if copy_files:
                # copy data files referenced in file_uuid field in a Node
                try:
                    if obj.file_uuid:
                        obj.file_uuid = copy_file(obj.file_uuid)
                except AttributeError:
                    pass

                # copy metadata files associated with an Investigation
                try:
                    if obj.isarchive_file or obj.pre_isarchive_file:
                        try:
                            obj.isarchive_file = copy_file(obj.isarchive_file)
                        except:
                            pass
                        try:
                            obj.pre_isarchive_file = copy_file(
                                obj.pre_isarchive_file)
                        except:
                            pass
                except AttributeError:
                    pass

            try:
                if obj.uuid:
                    obj.uuid = None
            except AttributeError:
                pass

            if field is not None:
                setattr(obj, field, value)

            obj.save()

            # plug the original object and its copy into the dictionary
            associated_copy[model.objects.get(id=orig_obj_id)] = obj

            if root_obj is None:
                root_obj = obj

    # work out Many-To-Manys
    for model in duplicate_order:
        sub_objects = collector.data[model]
        for obj in sub_objects:
            m2m_dict = dict()
            for m2m in model._meta.many_to_many:
                m2m_manager = getattr(obj, "%s_set" % m2m.name)
                m2m_dict[m2m.name] = m2m_manager.all()
            try:
                copied_obj = associated_copy[obj]
                for m2m in model._meta.many_to_many:
                    m2m_field_manager = getattr(copied_obj, m2m.name)
                    for item in m2m_dict[m2m.name]:
                        m2m_field_manager.add(associated_copy[item])
            except KeyError:
                pass

    return root_obj


@task()
def copy_dataset(dataset, owner, versions=None, copy_files=False):
    logger.info("logging from copy_dataset")
    if versions is None:
        versions = [dataset.get_version()]
    # count total number of objects to copy
    items_to_copy = 1
    collector = Collector("default")
    for version in versions:
        collector.collect([dataset.get_investigation(version)])
        for key in collector.data.keys():
            items_to_copy += len(collector.data[key])
    # check to see if dataset already exists for provided user
    dataset_copy = None
    data_sets = DataSet.objects.filter(name="%s (copy)" % dataset.name)
    for data_set in data_sets:
        logger.debug("DataSet: %s", data_set)
        if data_set.get_owner() == owner:
            dataset_copy = data_set
    # if after checking all datasets there one with this name owned by the
    # given user, create new dataset
    if dataset_copy is None:
        # create new dataset with copied information
        dataset_copy = DataSet.objects.create(
            name="%s (copy)" % dataset.name, summary=dataset.summary,
            description=dataset.description, slug=dataset.slug
        )
        # set the owner to the provided user
        dataset_copy.set_owner(owner)
        dataset_copy.save()
        logger.info("copy_dataset: Created data set %s", dataset_copy.name)

    # make copies of investigations and their links and assign to newly
    # created dataset
    for version in versions:
        inv = dataset.get_investigation(version)
        node_collection = copy_object(inv, copy_files=copy_files)
        node_collection.save()

        # find the corresponding Investigation object
        try:
            inv = Investigation.objects.get(uuid=node_collection.uuid)
        except Investigation.DoesNotExist:
            inv = Study.objects.get(uuid=node_collection.uuid).investigation

        # use the Investigation object to grab its InvestigationLink object
        il = InvestigationLink.objects.get(investigation=inv)
        il.data_set = dataset_copy
        il.save()
        # annotate the investigation
        annotate_nodes(inv.uuid)

    # calculate total number of files and total number of bytes
    dataset_copy.file_size = dataset.get_file_size()
    dataset_copy.file_count = dataset.get_file_count()
    dataset_copy.save()

    return dataset_copy


@task()
def collect_site_statistics():
    SiteStatistics.objects.create().collect()
