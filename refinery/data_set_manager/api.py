'''
Created on Nov 29, 2012

@author: nils
'''
import logging

from tastypie.constants import ALL, ALL_WITH_RELATIONS
from tastypie.resources import ModelResource

from .models import Attribute

logger = logging.getLogger(__name__)


class AttributeResource(ModelResource):
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
