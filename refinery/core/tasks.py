import logging

from django.db.models.deletion import Collector
from django.db.models.fields.related import ForeignKey

from celery.task import task

from file_store.models import FileStoreItem
from file_store.tasks import import_file

from .models import SiteStatistics

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
def collect_site_statistics():
    SiteStatistics.objects.create().collect()
