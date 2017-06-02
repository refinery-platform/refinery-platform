'''
Created on Jul 2, 2012

@author: nils
'''

import logging
import string

from django.conf import settings

from haystack import indexes

from .models import AnnotatedNode, Node
from file_store.models import FileStoreItem

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

    # dynamic fields:
    # https://groups.google.com/forum/?fromgroups#!topic/django-haystack/g39QjTkN-Yg
    # http://stackoverflow.com/questions/7399871/django-haystack-sort-results-by-title
    def prepare(self, object):
        data = super(NodeIndex, self).prepare(object)
        annotations = AnnotatedNode.objects.filter(node=object)
        uuid = str(object.study.id)

        if object.assay is not None:
            uuid += "_" + str(object.assay.id)
        # create dynamic fields for each attribute
        for annotation in annotations:
            if annotation.attribute_subtype is None:
                name = annotation.attribute_type
            else:
                name = annotation.attribute_subtype + "_" + \
                       annotation.attribute_type
            if annotation.attribute_value_unit is None:
                value = annotation.attribute_value
            else:
                value = annotation.attribute_value + " " + \
                        annotation.attribute_value_unit
            # replace problematic characters in field names
            name = string.replace(name, "/",
                                  settings.REFINERY_SOLR_SPACE_DYNAMIC_FIELDS)
            name = string.replace(name, "(",
                                  settings.REFINERY_SOLR_SPACE_DYNAMIC_FIELDS)
            name = string.replace(name, ")",
                                  settings.REFINERY_SOLR_SPACE_DYNAMIC_FIELDS)
            name = string.replace(name, "#",
                                  settings.REFINERY_SOLR_SPACE_DYNAMIC_FIELDS)
            name = string.replace(name, ",",
                                  settings.REFINERY_SOLR_SPACE_DYNAMIC_FIELDS)
            name = string.replace(name, " ",
                                  settings.REFINERY_SOLR_SPACE_DYNAMIC_FIELDS)
            name = string.replace(name, "'",
                                  settings.REFINERY_SOLR_SPACE_DYNAMIC_FIELDS)

            key = name + "_" + uuid + "_s"
            # a node might have multiple parents with different attribute
            # values for a given attribute
            # e.g. parentA Characteristic[cell type] = K562 and
            # parentB Characteristic[cell type] = HeLa
            # child nodes should inherit all attributes of their parents as a
            # concatenation of the unique list
            # old version (only one attribute kept):
            # data[key] = value
            if key not in data:
                data[key] = set()
            if value != "":
                data[key].add(value)
            else:
                data[key].add("N/A")
        # iterate over all keys in data and join sets into strings
        for key, value in data.iteritems():
            if type(value) is set:
                data[key] = " + ".join(value)

        # add type as dynamic field to get proper facet values
        data[NodeIndex.TYPE_PREFIX + "_" + uuid + "_s"] = object.type
        # add name as dynamic field to get proper facet values
        data[NodeIndex.NAME_PREFIX + "_" + uuid + "_s"] = object.name
        # add analysis_uuid as dynamic field to get proper facet values
        if object.analysis_uuid is not None:
            data[NodeIndex.ANALYSIS_UUID_PREFIX + "_" + uuid + "_s"] = \
                object.analysis_uuid
        else:
            data[NodeIndex.ANALYSIS_UUID_PREFIX + "_" + uuid + "_s"] = "N/A"
        # add subanalysis as dynamic field to get proper facet values
        if object.subanalysis is not None:
            data[NodeIndex.SUBANALYSIS_PREFIX + "_" + uuid + "_s"] = \
                object.subanalysis
        else:
            data[NodeIndex.SUBANALYSIS_PREFIX + "_" + uuid + "_s"] = -1
        # add workflow_output as dynamic field to get proper facet values
        if object.workflow_output is not None:
            data[NodeIndex.WORKFLOW_OUTPUT_PREFIX + "_" + uuid + "_s"] = \
                object.workflow_output
        else:
            data[NodeIndex.WORKFLOW_OUTPUT_PREFIX + "_" + uuid + "_s"] = "N/A"
        # add file type as facet value
        try:
            file_store_item = FileStoreItem.objects.get(
                uuid=object.file_uuid)
        except(FileStoreItem.DoesNotExist,
               FileStoreItem.MultipleObjectsReturned) as e:
            logger.error("Couldn't properly fetch FileStoreItem: %s", e)
        else:
            if file_store_item:
                data[NodeIndex.FILETYPE_PREFIX + "_" + uuid + "_s"] =\
                    file_store_item.get_filetype()
            else:
                logger.warning(
                    "Unable to get file store item " + str(object.file_uuid) +
                    ". No file type available.")
                data[NodeIndex.FILETYPE_PREFIX + "_" + uuid + "_s"] = ""

            return data
