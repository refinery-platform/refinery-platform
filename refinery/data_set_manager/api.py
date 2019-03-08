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

from .models import (Attribute, Investigation, Node, Protocol,
                     ProtocolReference, ProtocolReferenceParameter,
                     Publication, Study)

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
    study = fields.ToOneField('data_set_manager.api.StudyResource', 'study')
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


class ProtocolResource(ModelResource):
    # Leads to to many "duplicated" references, i.e. many samples have the same
    # protocol parameters but are regarded unique.
    # references = fields.ToManyField(
    #     'data_set_manager.api.ProtocolReferenceResource',
    #     attribute=lambda bundle: (
    #         ProtocolReference.objects.filter(
    #             protocol=bundle.obj
    #         ).distinct()
    #     ),
    #     full=True,
    #     null=True
    # )

    class Meta:
        queryset = Protocol.objects.all()
        detail_uri_name = 'uuid'
        allowed_methods = ['get']
        resource_name = 'protocols'
        filtering = {
            'uuid': ALL
        }
        fields = [
            'description',
            'name'
        ]


class ProtocolReferenceResource(ModelResource):
    parameters = fields.ToManyField(
        'data_set_manager.api.ProtocolReferenceParameterResource',
        attribute=lambda bundle: (
            ProtocolReferenceParameter.objects.filter(
                protocol_reference=bundle.obj
            ).exclude(value__isnull=True).exclude(value__exact='').distinct()
        ),
        full=True,
        null=True
    )

    class Meta:
        queryset = ProtocolReference.objects.all()
        allowed_methods = ['get']
        resource_name = 'protocol-references'
        fields = [
            'id',
            'parameters'
        ]
        include_resource_uri = False


class ProtocolReferenceParameterResource(ModelResource):
    class Meta:
        queryset = (ProtocolReferenceParameter
                    .objects
                    .exclude(value__isnull=True)
                    .exclude(value__exact=''))
        allowed_methods = [
            'get'
        ]
        resource_name = 'protocol-reference-parameters'
        fields = [
            'name',
            'value',
            'value_unit'
        ]
        include_resource_uri = False


class PublicationResource(ModelResource):
    class Meta:
        queryset = Publication.objects.all()
        allowed_methods = ['get']
        resource_name = 'publications'


class StudyResource(ModelResource):
    investigation_uuid = fields.CharField(
        attribute='investigation__uuid',
        use_in='all'
    )
    protocols = fields.ToManyField(
        'data_set_manager.api.ProtocolResource',
        'protocol_set',
        full=True,
        null=True
    )
    publications = fields.ToManyField(
        'data_set_manager.api.PublicationResource',
        'publication_set',
        full=True,
        null=True
    )
    sources = fields.ToManyField(
        'data_set_manager.api.NodeResource',
        attribute=lambda bundle: (
            Node.objects
                .filter(
                    study=bundle.obj,
                    type='Source Name'
                )
        ),
        full=True,
        null=True
    )

    class Meta:
        queryset = Study.objects.all()
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        allowed_methods = ["get"]
        resource_name = "study"
        filtering = {
            'uuid': ALL,
            'investigation_uuid': ALL
        }
        # fields = ["uuid"]
