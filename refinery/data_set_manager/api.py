'''
Created on Nov 29, 2012

@author: nils
'''

from data_set_manager.models import AttributeOrder, Study, Assay
from tastypie import fields
from tastypie.authentication import Authentication
from tastypie.authorization import Authorization
from tastypie.constants import ALL, ALL_WITH_RELATIONS
from tastypie.resources import ModelResource


class StudyResource(ModelResource):
    class Meta:
        queryset = Study.objects.all()
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        allowed_methods = ["get"]
        resource_name = "study"
        filtering = { "uuid": ALL }
        fields = [ "uuid" ]

class AssayResource(ModelResource):
    class Meta:
        queryset = Assay.objects.all()
        detail_uri_name = 'uuid'    # for using UUIDs instead of pk in URIs
        allowed_methods = ["get"]
        resource_name = "assay"
        filtering = { "uuid": ALL }
        fields = [ "uuid" ]



class AttributeOrderResource(ModelResource):
    study = fields.ToOneField(StudyResource, "study")
    assay = fields.ToOneField(AssayResource, "assay")

    class Meta:
        queryset = AttributeOrder.objects.all().order_by("rank")
        allowed_methods = ["get", "patch", "put", "post" ]
        
        # TODO: replace with session or api key authentication and internal authorization 
        authentication = Authentication()
        authorization = Authorization()
        filtering = { "study": ALL_WITH_RELATIONS, "assay": ALL_WITH_RELATIONS, "subtype": ALL }
        excludes = []