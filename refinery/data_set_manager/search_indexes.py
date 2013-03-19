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
import file_store.tasks as file_store_tasks

logger = logging.getLogger(__name__)


class NodeIndex(indexes.SearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, use_template=True)
    uuid = indexes.CharField(model_attr='uuid')
    study_uuid = indexes.CharField(model_attr='study__uuid')
    assay_uuid = indexes.CharField(model_attr='assay__uuid',null=True)
    type = indexes.CharField(model_attr='type')
    name = indexes.CharField(model_attr='name',null=True)
    file_uuid = indexes.CharField(model_attr='file_uuid',null=True)
    species = indexes.IntegerField(model_attr='species',null=True)
    genome_build = indexes.CharField(model_attr='genome_build',null=True)
    is_annotation = indexes.BooleanField(model_attr='is_annotation')
    
    analysis_uuid = indexes.CharField(model_attr='analysis_uuid',null=True)
    subanalysis = indexes.IntegerField(model_attr='subanalysis',null=True)
    workflow_output = indexes.CharField(model_attr='workflow_output',null=True)
    
    #TODO: add modification date (based on registry)
        
    #attribute_type = models.TextField(db_index=True)
    # subtype further qualifies the attribute type, e.g. type = factor value and subtype = age
    #attribute_subtype = models.TextField(blank=True, null=True, db_index=True)
    #attribute_value = models.TextField(blank=True, null=True, db_index=True)
    #attribute_value_unit = models.TextField(blank=True, null=True)

    def get_model(self):
        return Node

    def index_queryset(self, using=None):
        """Used when the entire index for model is updated."""
        return self.get_model().objects.all() #filter(modification_date__lte=datetime.datetime.now())
    
    # dynamic fields: https://groups.google.com/forum/?fromgroups#!topic/django-haystack/g39QjTkN-Yg
    # and: http://stackoverflow.com/questions/7399871/django-haystack-sort-results-by-title
    def prepare(self, object):
        data = super(NodeIndex, self).prepare(object)
        annotations = AnnotatedNode.objects.filter( node=object )
            
        uuid = str( object.study.id )
        
        if object.assay is not None:
            uuid += "_" + str( object.assay.id ) 

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
            name = string.replace( name, ",", settings.REFINERY_SOLR_SPACE_DYNAMIC_FIELDS ) 
                
            name = string.replace( name, " ", settings.REFINERY_SOLR_SPACE_DYNAMIC_FIELDS ) 

            key = name + "_" + uuid + "_s"
                        
            # a node might have multiple parents with different attribute values for a given attribute
            # e.g. parentA Characteristic[cell type] = K562 and parentB Characteristic[cell type] = HeLa
            # child nodes should inherit all attributes of their parents as a concatenation of the 
            # unique list
            #
            # old version (only one attribute kept):
            # data[key] = value
            if not key in data:
                data[key] = set();
            
            if value != "":    
                data[key].add( value )
            else:
                data[key].add( "N/A" )
            
        # iterate over all keys in data and join sets into strings
        for key, value in data.iteritems():
            if type(value) is set:
                data[key] = " + ".join(value)
            
        # add type as dynamic field to get proper facet values
        data["REFINERY_TYPE_" + uuid + "_s"] = object.type

        # add name as dynamic field to get proper facet values
        data["REFINERY_NAME_" + uuid + "_s"] = object.name

        # add analysis_uuid as dynamic field to get proper facet values
        data["REFINERY_ANALYSIS_UUID_" + uuid + "_s"] = object.analysis_uuid

        # add subanalysis as dynamic field to get proper facet values
        data["REFINERY_SUBANALYSIS_" + uuid + "_s"] = object.subanalysis
        
        # add workflow_output as dynamic field to get proper facet values
        data["REFINERY_WORKFLOW_OUTPUT" + uuid + "_s"] = object.workflow_output


        # add file type as facet value        
        file_store_item = file_store_tasks.read( object.file_uuid );
        
        if file_store_item:
            data["REFINERY_FILETYPE_" + uuid + "_s"] = file_store_item.get_filetype()
        else:
            logger.warning( "Unable to get file store item " + str( object.file_uuid ) + ". No file type available." )
            data["REFINERY_FILETYPE_" + uuid + "_s"] = ""
                    
        return data



