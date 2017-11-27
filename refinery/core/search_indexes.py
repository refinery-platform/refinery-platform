'''
Created on Jul 2, 2012

@author: nils
'''

import logging

from django.db import models
from django.template import loader
from django.template.context import Context

from haystack import indexes

import data_set_manager

logger = logging.getLogger(__name__)


class DataSetIndex(indexes.SearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, use_template=True)
    name = indexes.CharField(model_attr='name', null=True)
    accession = indexes.EdgeNgramField(model_attr='accession', null=True)
    title = indexes.EdgeNgramField(model_attr='title')
    dbid = indexes.IntegerField(model_attr='id')
    uuid = indexes.CharField(model_attr='uuid')
    summary = indexes.CharField(model_attr='summary', null=True)
    description = indexes.EdgeNgramField(null=True)
    creation_date = indexes.DateTimeField(model_attr='creation_date')
    modification_date = indexes.DateTimeField(model_attr='modification_date')
    submitter = indexes.MultiValueField(null=True)
    measurement = indexes.MultiValueField(null=True, faceted=True)
    technology = indexes.MultiValueField(null=True, faceted=True)
    # We only need one multi value field to story every id that has access
    # since Solr only handles read permissions
    access = indexes.MultiValueField(null=True)
    # We add this for autocomplete
    # content_auto = indexes.EdgeNgramField(null=True)

    def get_model(self):
        return models.get_model('core', 'DataSet')

    def index_queryset(self, using=None):
        """Used when the entire index for model is updated"""
        return self.get_model().objects.all()

    def prepare_description(self, object):
        try:
            return object.get_investigation().get_description()
        except AttributeError as e:
            logger.error(
                "Could not fetch Investigation for DataSet with UUID: %s %s",
                object.uuid,
                e
            )
        return ""

    def prepare_access(self, object):
        access_list = []
        if object.get_owner() is not None:
            access_list.append('u_{}'.format(object.get_owner().id))
        for group_id in object.get_group_ids():
            access_list.append('g_{}'.format(group_id))
        return access_list

    def prepare_submitter(self, object):
        investigation = object.get_investigation()

        if investigation is None:
            return []

        submitters = []

        for contact in investigation.contact_set.all():
            submitters.append(
                u"{}, {}".format(
                    contact.last_name,
                    contact.first_name
                )
            )

        studies = investigation.study_set.all()
        for study in studies:
            for contact in study.contact_set.all():
                submitters.append(
                    u"{}, {}".format(
                        contact.last_name,
                        contact.first_name
                    )
                )

        # Cast to `list` looks redundant, but MultiValueField stores sets
        # improperly, introducing a search bug.
        # https://github.com/refinery-platform/refinery-platform/pull/1716#discussion_r115339987
        return list(set(submitters))

    def prepare_measurement(self, object):
        investigation = object.get_investigation()

        if investigation is None:
            return []

        measurements = []

        studies = investigation.study_set.all()
        for study in studies:
            for assay in study.assay_set.all():
                measurements.append(assay.measurement)

        # Cast to `list` looks redundant, but MultiValueField stores sets
        # improperly, introducing a search bug.
        # https://github.com/refinery-platform/refinery-platform/pull/1716#discussion_r115339987
        return list(set(measurements))

    def prepare_technology(self, object):
        investigation = object.get_investigation()

        if investigation is None:
            return []

        technologies = []

        studies = investigation.study_set.all()
        for study in studies:
            for assay in study.assay_set.all():
                technologies.append(assay.technology)

        # Cast to `list` looks redundant, but MultiValueField stores sets
        # improperly, introducing a search bug.
        # https://github.com/refinery-platform/refinery-platform/pull/1716#discussion_r115339987
        return list(set(technologies))

    # from:
    # http://django-haystack.readthedocs.org/en/latest/rich_content_extraction.html
    # also:
    # http://django-haystack.readthedocs.org/en/latest/searchindex_api.html
    def prepare(self, data_set):
        logger.info("Start preparing '%s' for indexing", data_set.name)
        data = super(DataSetIndex, self).prepare(data_set)
        investigation = data_set.get_investigation()
        nodes = []
        if investigation is not None:
            studies = investigation.study_set.all()
            for study in studies:
                assays = study.assay_set.all()
                for assay in assays:
                    nodes += list(
                        data_set_manager.models.AnnotatedNode.objects.filter(
                            study__uuid=study.uuid,
                            assay__uuid=assay.uuid,
                            node_type__in=data_set_manager.models.Node.FILES
                        ).distinct(
                            'node_name',
                            'attribute_type',
                            'attribute_subtype',
                            'attribute_value',
                            'attribute_value_unit'
                        )
                    )

            # perform the template processing to render the
            # text field with *all* of our node data visible for indexing
            template = loader.select_template(
                ('search/indexes/core/dataset_text.txt',)
            )
            data['text'] = template.render(
                Context({
                    'object': data_set,
                    'nodes': nodes
                })
            )
        logger.info("Successfully prepared '%s' for indexing", data_set.name)
        return data


class ProjectIndex(indexes.SearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, use_template=True)
    access = indexes.MultiValueField(null=True)
    name = indexes.CharField(model_attr='name', null=True)
    uuid = indexes.CharField(model_attr='uuid')
    summary = indexes.CharField(model_attr='summary')
    description = indexes.CharField(model_attr='description', null=True)
    creation_date = indexes.DateTimeField(model_attr='creation_date')
    modification_date = indexes.DateTimeField(model_attr='modification_date')
    # We add this for autocomplete.
    content_auto = indexes.EdgeNgramField(model_attr='name')

    def get_model(self):
        return models.get_model('core', 'Project')

    def prepare_access(self, object):
        access_list = []
        if object.get_owner() is not None:
            access_list.append('u_{}'.format(object.get_owner().id))
        for group in object.get_groups():
            if id in group:
                access_list.append('g_{}'.format(group.id))
        return access_list

    def index_queryset(self, using=None):
        """Used when the entire index for model is updated."""
        return self.get_model().objects.all().exclude(is_catch_all=True)
