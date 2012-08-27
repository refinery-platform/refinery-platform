'''
Created on Jul 2, 2012

@author: nils
'''


from data_set_manager.models import Node, AnnotatedNode
from django.template import loader
from django.template.context import Context
from haystack import indexes
import settings
import string
import logging


logger = logging.getLogger(__name__)


class NodeIndex(indexes.SearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, use_template=True)
    uuid = indexes.CharField(model_attr='uuid')
    study_uuid = indexes.CharField(model_attr='study__uuid')
    assay_uuid = indexes.CharField(model_attr='assay__uuid',null=True)
    type = indexes.CharField(model_attr='type')
    name = indexes.CharField(model_attr='name',null=True)
    file_uuid = indexes.CharField(model_attr='file_uuid',null=True)
    
    #TODO: add modification date (based on registry)
        
    #attribute_type = models.TextField(db_index=True)
    # subtype further qualifies the attribute type, e.g. type = factor value and subtype = age
    #attribute_subtype = models.TextField(blank=True, null=True, db_index=True)
    #attribute_value = models.TextField(blank=True, null=True, db_index=True)
    #attribute_value_unit = models.TextField(blank=True, null=True)

    def get_model(self):
        return Node

    def index_queryset(self):
        """Used when the entire index for model is updated."""
        return self.get_model().objects.all() #filter(modification_date__lte=datetime.datetime.now())
    
    # dynamic fields: https://groups.google.com/forum/?fromgroups#!topic/django-haystack/g39QjTkN-Yg
    # and: http://stackoverflow.com/questions/7399871/django-haystack-sort-results-by-title
    def prepare(self, object):
        logger.info( "In prepare for " + str( object ) )
        data = super(NodeIndex, self).prepare(object)
        annotations = AnnotatedNode.objects.filter( node=object )
        
        uuid = str( object.study.id )
        
        if object.assay is not None:
            uuid += "_" + str( object.assay.id ) 

        logger.info( "In prepare for " + str( object ) + " uuid = " + uuid )


        # create dynamic fields for each attribute  
        for annotation in annotations:
            if annotation.attribute_subtype is None:
                name = annotation.attribute_type
            else:
                name = annotation.attribute_subtype + "_" + annotation.attribute_type
                                 
            if annotation.attribute_value_unit is None:
                value = annotation.attribute_value
            else: 
                value = annotation.attribute_value + " " + annotation.attribute_value_unit
            
            # replace problematic characters in field names
            name = string.replace( name, "/", settings.REFINERY_SOLR_SPACE_DYNAMIC_FIELDS ) 
            name = string.replace( name, "(", settings.REFINERY_SOLR_SPACE_DYNAMIC_FIELDS ) 
            name = string.replace( name, ")", settings.REFINERY_SOLR_SPACE_DYNAMIC_FIELDS ) 
            name = string.replace( name, "#", settings.REFINERY_SOLR_SPACE_DYNAMIC_FIELDS ) 
                
            name = string.replace( name, " ", settings.REFINERY_SOLR_SPACE_DYNAMIC_FIELDS ) 

            key = name + "_" + uuid + "_s"
            data[key] = value
            
        # add type as dynamic field to get proper facet values
        data["type_" + uuid + "_s"] = object.type

        logger.info( "Done with prepare for " + str( object ) )
            
        return data



