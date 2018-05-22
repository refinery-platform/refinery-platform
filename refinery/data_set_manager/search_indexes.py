'''
Created on Jul 2, 2012

@author: nils
'''

import logging
import re

from django.conf import settings

import celery
from haystack import indexes
from haystack.exceptions import SkipDocument

import constants
import core
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
    DOWNLOAD_URL = "REFINERY_DOWNLOAD_URL_s"

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

    @staticmethod
    def _check_skip_indexing_conditions(node):
        if node.type not in Node.INDEXED_FILES:
            raise SkipDocument()

        try:
            core.models.AnalysisNodeConnection.objects.get(
                node=node,
                is_refinery_file=False,
                direction=core.models.OUTPUT_CONNECTION
            )
        except (core.models.AnalysisNodeConnection.DoesNotExist,
                core.models.AnalysisNodeConnection.MultipleObjectsReturned):
            # Not all Nodes will have an AnalysisNodeConnection
            # and that's okay
            pass
        else:
            raise SkipDocument()

    # dynamic fields:
    # https://groups.google.com/forum/?fromgroups#!topic/django-haystack/g39QjTkN-Yg
    # http://stackoverflow.com/questions/7399871/django-haystack-sort-results-by-title
    def prepare(self, node):
        self._check_skip_indexing_conditions(node)

        data = super(NodeIndex, self).prepare(node)
        annotations = AnnotatedNode.objects.filter(node=node)
        id_suffix = str(node.study.id)

        try:
            data_set = node.study.get_dataset()
            data['data_set_uuid'] = data_set.uuid
        except RuntimeError as e:
            logger.warn(e)

        if node.assay is not None:
            id_suffix += "_" + str(node.assay.id)

        id_suffix = "_" + id_suffix + "_s"

        try:
            file_store_item = FileStoreItem.objects.get(uuid=node.file_uuid)
        except(FileStoreItem.DoesNotExist,
               FileStoreItem.MultipleObjectsReturned) as e:
            logger.error("Couldn't properly fetch FileStoreItem: %s", e)
            file_store_item = None
            download_url_or_state = constants.NOT_AVAILABLE
            data['filetype_Characteristics' + NodeIndex.GENERIC_SUFFIX] = ''
        else:
            data['filetype_Characteristics' + NodeIndex.GENERIC_SUFFIX] = \
                file_store_item.filetype
            download_url_or_state = file_store_item.get_datafile_url()
            if download_url_or_state is None:
                download_url_or_state = file_store_item.get_import_status()
                # UI can not handle FAILURE state
                if download_url_or_state == celery.states.FAILURE:
                    download_url_or_state = constants.NOT_AVAILABLE

        data.update(self._assay_data(node))

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
                    data[key].add(constants.NOT_AVAILABLE)

        # iterate over all keys in data and join sets into strings
        for key, value in data.iteritems():
            if type(value) is set:
                data[key] = " + ".join(sorted(value))

        data.update({
            NodeIndex.DOWNLOAD_URL: download_url_or_state,
            NodeIndex.TYPE_PREFIX + id_suffix: node.type,
            NodeIndex.NAME_PREFIX + id_suffix: node.name,
            NodeIndex.FILETYPE_PREFIX + id_suffix:
                "" if file_store_item is None
                else file_store_item.filetype,
            NodeIndex.ANALYSIS_UUID_PREFIX + id_suffix:
                constants.NOT_AVAILABLE if node.get_analysis() is None
                else node.get_analysis().name,
            NodeIndex.SUBANALYSIS_PREFIX + id_suffix:
                (-1 if node.subanalysis is None  # TODO: upgrade flake8
                 else node.subanalysis),         # and remove parentheses
            NodeIndex.WORKFLOW_OUTPUT_PREFIX + id_suffix:
                constants.NOT_AVAILABLE if node.workflow_output is None
                else node.workflow_output
        })

        return data
