'''
Created on Nov 29, 2012

@author: nils
'''
import logging

from django.conf.urls import url

from constants import UUID_RE
from tastypie import fields
from tastypie.authentication import Authentication
from tastypie.authorization import Authorization
from tastypie.constants import ALL, ALL_WITH_RELATIONS
from tastypie.resources import ModelResource

from file_store.models import FileStoreItem

from .models import Attribute, Investigation, Node, Publication

logger = logging.getLogger(__name__)


class AttributeResource(ModelResource):
    node = fields.ForeignKey('data_set_manager.api.NodeResource', 'node',
                             use_in='all')

    class Meta:
        queryset = Attribute.objects.all()
        detail_uri_name = 'id'
        allowed_methods = ['get']
        resource_name = 'attributes'
        include_resource_uri = False
        filtering = {
            'node': ALL_WITH_RELATIONS,
            'type': ALL,
            'value_accession': ALL,
        }
        fields = [
            'subtype',
            'type',
            'value',
            'value_accession',
            'value_source',
            'value_unit'
        ]


class NodeResource(ModelResource):
    parents = fields.ToManyField('data_set_manager.api.NodeResource',
                                 'parents')
    children = fields.ToManyField('data_set_manager.api.NodeResource',
                                  'children')
    attributes = fields.ToManyField(
        'data_set_manager.api.AttributeResource',
        attribute=lambda bundle: (
            Attribute.objects
            .exclude(value__isnull=True)
            .exclude(value__exact='')
            .filter(node=bundle.obj, subtype='organism')
        ), use_in='all', full=True, null=True
    )

    class Meta:
        queryset = Node.objects.all()
        resource_name = 'node'
        detail_uri_name = 'uuid'  # for using UUIDs instead of pk in URIs
        # required for public data set access by anonymous users
        authentication = Authentication()
        authorization = Authorization()
        allowed_methods = ['get']
        fields = ['analysis_uuid', 'assay', 'attributes', 'children',
                  'file_url', 'file_uuid', 'name', 'parents', 'study',
                  'subanalysis', 'type', 'uuid']
        filtering = {
            'uuid': ALL,
            'study': ALL_WITH_RELATIONS,
            'assay': ALL_WITH_RELATIONS,
            'file_uuid': ALL,
            'type': ALL
        }
        limit = 0
        max_limit = 0

    def prepend_urls(self):
        return [
            url((r"^(?P<resource_name>%s)/(?P<uuid>" + UUID_RE + r")/$") %
                self._meta.resource_name,
                self.wrap_view('dispatch_detail'),
                name="api_dispatch_detail"),
        ]

    def dehydrate(self, bundle):
        # return download URL of file if a file is associated with the node
        try:
            file_item = FileStoreItem.objects.get(uuid=bundle.obj.file_uuid)
        except AttributeError:
            logger.warning("No UUID provided")
            bundle.data['file_url'] = None
            bundle.data['file_import_status'] = None
        except FileStoreItem.DoesNotExist:
            logger.warning(
                "Unable to find file store item with UUID '%s'",
                bundle.obj.file_uuid)
            bundle.data['file_url'] = None
            bundle.data['file_import_status'] = None
        else:
            bundle.data['file_url'] = file_item.get_datafile_url()
            bundle.data['file_import_status'] = file_item.get_import_status()
        return bundle


class InvestigationResource(ModelResource):
    class Meta:
        queryset = Investigation.objects.all()
        detail_uri_name = 'uuid'
        allowed_methods = ['get']
        resource_name = 'investigations'
        filtering = {
            'uuid': ALL
        }


class PublicationResource(ModelResource):
    class Meta:
        queryset = Publication.objects.all()
        allowed_methods = ['get']
        resource_name = 'publications'
