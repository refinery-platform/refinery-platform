'''
Created on Nov 29, 2012

@author: nils
'''

from tastypie import fields
from tastypie.constants import ALL, ALL_WITH_RELATIONS
from tastypie.resources import ModelResource

from .models import (Assay, Attribute, Investigation, Node, Protocol,
                     ProtocolReference, ProtocolReferenceParameter,
                     Publication, Study)


class AttributeResource(ModelResource):
    node = fields.ForeignKey('core.api.NodeResource', 'node', use_in='all')

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
        'core.api.NodeResource',
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


class AssayResource(ModelResource):
    study_uuid = fields.CharField(
        attribute='study__uuid',
        use_in='all'
    )

    class Meta:
        queryset = Assay.objects.all()
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        allowed_methods = ['get']
        resource_name = 'assay'
        filtering = {
            'uuid': ALL,
            'study_uuid': ALL
        }
        # fields = ["uuid"]
