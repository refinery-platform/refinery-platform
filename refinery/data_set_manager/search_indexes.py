'''
Created on Jul 2, 2012

@author: nils
'''

import logging
import re

from django.conf import settings

from haystack import indexes

from file_store.models import FileStoreItem

from .models import AnnotatedNode, Assay, Node

logger = logging.getLogger(__name__)


class NodeIndex(indexes.SearchIndex, indexes.Indexable):
    TYPE_PREFIX = "REFINERY_TYPE"
    NAME_PREFIX = "REFINERY_NAME"
    WORKFLOW_OUTPUT_PREFIX = "REFINERY_WORKFLOW_OUTPUT"
    ANALYSIS_UUID_PREFIX = "REFINERY_ANALYSIS_UUID"
    SUBANALYSIS_PREFIX = "REFINERY_SUBANALYSIS"
    FILETYPE_PREFIX = "REFINERY_FILETYPE"

    text = indexes.CharField(document=True, use_template=True)
    uuid = indexes.CharField(model_attr='uuid')
    study_uuid = indexes.CharField(model_attr='study__uuid')
    assay_uuid = indexes.CharField(model_attr='assay__uuid', null=True)
    data_set_uuid = indexes.CharField(null=True)
    type = indexes.CharField(model_attr='type')
    name = indexes.CharField(model_attr='name', null=True)
    file_uuid = indexes.CharField(model_attr='file_uuid', null=True)
    species = indexes.IntegerField(model_attr='species', null=True)
    genome_build = indexes.CharField(model_attr='genome_build', null=True)
    is_annotation = indexes.BooleanField(model_attr='is_annotation')
    analysis_uuid = indexes.CharField(model_attr='analysis_uuid', null=True)
    subanalysis = indexes.IntegerField(model_attr='subanalysis', null=True)
    workflow_output = indexes.CharField(model_attr='workflow_output',
                                        null=True)
    # TODO: add modification date (based on registry)

    def get_model(self):
        return Node

    def index_queryset(self, using=None):
        """Used when the entire index for model is updated."""
        return self.get_model().objects.all()

    GENERIC_SUFFIX = "_generic_s"

    def _assay_data(self, object):
        data = {}
        for field in Assay._meta.fields:
            if field.name in ['id', 'uuid', 'study', 'file_name']:
                continue
            key = field.name + '_Characteristics' + NodeIndex.GENERIC_SUFFIX
            data[key] = set()
            assay = object.assay
            if assay is not None:
                assay_attr = getattr(assay, field.name)
                if assay_attr is not None:
                    data[key].add(assay_attr)
        return data

    # dynamic fields:
    # https://groups.google.com/forum/?fromgroups#!topic/django-haystack/g39QjTkN-Yg
    # http://stackoverflow.com/questions/7399871/django-haystack-sort-results-by-title
    def prepare(self, object):

        data = super(NodeIndex, self).prepare(object)
        annotations = AnnotatedNode.objects.filter(node=object)
        id_suffix = str(object.study.id)

        try:
            data_set = object.study.get_dataset()
            data['data_set_uuid'] = data_set.uuid
        except RuntimeError as e:
            logger.warn(e)

        if object.assay is not None:
            id_suffix += "_" + str(object.assay.id)

        id_suffix = "_" + id_suffix + "_s"

        data['filename_Characteristics' + NodeIndex.GENERIC_SUFFIX] = \
            re.sub(r'.*/', '', data['name'])

        data.update(self._assay_data(object))

        # create dynamic fields for each attribute
        for annotation in annotations:
            name = annotation.attribute_type
            if annotation.attribute_subtype is not None:
                name = annotation.attribute_subtype + "_" + name

            value = annotation.attribute_value
            if annotation.attribute_value_unit is not None:
                value += " " + annotation.attribute_value_unit

            name = re.sub(r'\W',
                          settings.REFINERY_SOLR_SPACE_DYNAMIC_FIELDS,
                          name)

            uniq_key = name + id_suffix
            generic_key = name + NodeIndex.GENERIC_SUFFIX
            # a node might have multiple parents with different attribute
            # values for a given attribute
            # e.g. parentA Characteristic[cell type] = K562 and
            # parentB Characteristic[cell type] = HeLa
            # child nodes should inherit all attributes of their parents as a
            # concatenation of the unique list
            # old version (only one attribute kept):
            # data[key] = value
            for key in (uniq_key, generic_key):
                if key not in data:
                    data[key] = set()
                if value != "":
                    data[key].add(value)
                else:
                    data[key].add("N/A")
        # iterate over all keys in data and join sets into strings
        # TODO: This doesn't feel right: facet each separately?
        for key, value in data.iteritems():
            if type(value) is set:
                data[key] = " + ".join(value)

        try:
            file_store_item = FileStoreItem.objects.get(
                uuid=object.file_uuid)
        except(FileStoreItem.DoesNotExist,
               FileStoreItem.MultipleObjectsReturned) as e:
            logger.error("Couldn't properly fetch FileStoreItem: %s", e)
            file_store_item = None

        data.update({
            'download':
                '' if file_store_item is None
                else file_store_item.get_datafile_url(),
            NodeIndex.TYPE_PREFIX + id_suffix:
                object.type,
            NodeIndex.NAME_PREFIX + id_suffix:
                object.name,
            NodeIndex.FILETYPE_PREFIX + id_suffix:
                "" if file_store_item is None
                else file_store_item.get_filetype(),
            NodeIndex.ANALYSIS_UUID_PREFIX + id_suffix:
                "N/A" if object.analysis_uuid is None
                else object.analysis_uuid,
            NodeIndex.SUBANALYSIS_PREFIX + id_suffix:
                (-1 if object.subanalysis is None  # TODO: upgrade flake8
                 else object.subanalysis),         # and remove parentheses
            NodeIndex.WORKFLOW_OUTPUT_PREFIX + id_suffix:
                "N/A" if object.workflow_output is None
                else object.workflow_output
        })

        return data
