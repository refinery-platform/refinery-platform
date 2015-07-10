'''
Created on Jul 2, 2012

@author: nils
'''

import logging
from core.models import DataSet, Project
from data_set_manager.models import Node, AnnotatedNode
from data_set_manager.utils import get_node_types
from django.template import loader
from django.template.context import Context
from haystack import indexes

# get module logger
logger = logging.getLogger(__name__)


class DataSetIndex(indexes.SearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, use_template=True)
    name = indexes.CharField(model_attr='name', null=True)
    title = indexes.CharField(null=True)
    uuid = indexes.CharField(model_attr='uuid')
    summary = indexes.CharField(model_attr='summary', null=True)
    description = indexes.CharField(null=True)
    creation_date = indexes.DateTimeField(model_attr='creation_date')
    modification_date = indexes.DateTimeField(model_attr='modification_date')

    submitter = indexes.MultiValueField(null=True)
    measurement = indexes.MultiValueField(null=True, faceted=True)
    technology = indexes.MultiValueField(null=True, faceted=True)

    # We only need one multi value field to story every id that has access since
    # Solr only handles read permissions.
    access = indexes.MultiValueField(null=True)

    # We add this for autocomplete.
    content_auto = indexes.EdgeNgramField(null=True)

    def get_model(self):
        return DataSet

    def index_queryset(self, using=None):
        """Used when the entire index for model is updated."""
        return self.get_model().objects.all()

    def prepare_description(self, object):
        return object.get_investigation().get_description()

    def prepare_title(self, object):
        return object.get_investigation().get_title()

    def prepare_content_auto(self, object):
        return object.get_investigation().get_title()

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
            submitters.append(contact.last_name + ", " + contact.first_name)

        studies = investigation.study_set.all()
        for study in studies:
            for contact in study.contact_set.all():
                submitters.append(contact.last_name + ", " + contact.first_name)

        return set(submitters)

    def prepare_measurement(self, object):
        investigation = object.get_investigation()

        if investigation is None:
            return []

        measurements = []

        studies = investigation.study_set.all()
        for study in studies:
            for assay in study.assay_set.all():
                measurements.append(assay.measurement)

        return set(measurements)

    def prepare_technology(self, object):
        investigation = object.get_investigation()

        if investigation is None:
            return []

        technologies = []

        studies = investigation.study_set.all()
        for study in studies:
            for assay in study.assay_set.all():
                technologies.append(assay.technology)

        return set(technologies)

    # Why?
    # def prepare_name(self, object):
    #     return object.name

    # from:
    # http://django-haystack.readthedocs.org/en/latest/rich_content_extraction.html
    # also:
    # http://django-haystack.readthedocs.org/en/latest/searchindex_api.html
    def prepare(self, data_set):
        logger.info(
            "Start preparing \"" + data_set.name + "\" for indexing."
        )
        data = super(DataSetIndex, self).prepare(data_set)

        investigation = data_set.get_investigation()

        nodes = []

        # TODO: optimize this query
        if investigation is not None:
            studies = investigation.study_set.all()
            for study in studies:
                assays = study.assay_set.all()
                for assay in assays:
                    node_types = get_node_types(
                        study.uuid,
                        assay.uuid,
                        files_only=True,  # This parameter is never
                        filter_set=Node.FILES
                    )
                    for node_type in node_types:
                        nodes = nodes + list(
                            AnnotatedNode.objects.filter(
                                node_type=node_type,
                                study=study,
                                assay=assay
                            ).values()
                        )

            # for node in nodes:
            #    print node["node_name"] + " " + node["attribute_type"] + " " +
            #    node["attribute_value"]

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

        logger.info(
            "Successfully prepared \"" + data_set.name + "\" for indexing."
        )

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
    # content_auto = indexes.EdgeNgramField(model_attr='summary')

    def get_model(self):
        return Project

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
