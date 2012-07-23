'''
Created on Jul 2, 2012

@author: nils
'''


from core.models import DataSet, Project
from data_set_manager.models import Node, AnnotatedNode
from data_set_manager.utils import get_node_types
from django.template import loader
from django.template.context import Context
from haystack import indexes
import datetime


class DataSetIndex(indexes.SearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, use_template=True)
<<<<<<< HEAD
=======
    owner_id = indexes.CharField() # id of the user who owns this project
    group_ids = indexes.MultiValueField(null=True) # ids of the groups who have read permission for this data set    
>>>>>>> 364d16d401b820e8c71632a16caab1f1d62e90b9
    name = indexes.CharField(model_attr='name', null=True )
    uuid = indexes.CharField(model_attr='uuid')
    summary = indexes.CharField(model_attr='summary')        
    creation_date = indexes.DateTimeField(model_attr='creation_date' )
    modification_date = indexes.DateTimeField(model_attr='modification_date' )

    submitter = indexes.MultiValueField(null=True)
    measurement = indexes.MultiValueField(null=True, faceted=True )
    technology = indexes.MultiValueField(null=True, faceted=True )
    # We add this for autocomplete.
    content_auto = indexes.EdgeNgramField(model_attr='name')

    def get_model(self):
        return DataSet

<<<<<<< HEAD
=======
    def prepare_owner_id(self, object):
        return object.get_owner().id

    def prepare_group_ids(self, object):
        return [ g["id"] for g in object.get_groups() ]

>>>>>>> 364d16d401b820e8c71632a16caab1f1d62e90b9
    def index_queryset(self):
        """Used when the entire index for model is updated."""
        return self.get_model().objects.all()
    
    def prepare_submitter(self,object):        
        investigation = object.get_investigation()
        
        if investigation is None:
            return []
        
        submitters = []
        
        for contact in investigation.contact_set.all():
            submitters.append( contact.last_name + ", " + contact.first_name )  
        
        studies = investigation.study_set.all()
        for study in studies:
            for contact in study.contact_set.all():
                submitters.append( contact.last_name + ", " + contact.first_name )  
                   
        return set(submitters) 


    def prepare_measurement(self,object):        
        investigation = object.get_investigation()
        
        if investigation is None:
            return []
        
        measurements = []
        
        studies = investigation.study_set.all()
        for study in studies:
            for assay in study.assay_set.all():
                measurements.append( assay.measurement )  
                
        return set(measurements)


    def prepare_technology(self,object):        
        investigation = object.get_investigation()
        
        if investigation is None:
            return []
        
        technologies = []
        
        studies = investigation.study_set.all()
        for study in studies:
            for assay in study.assay_set.all():
                technologies.append( assay.technology )  
                
        return set(technologies)
    
    
    def prepare_name(self, object):
        return object.name
    
    # from: http://django-haystack.readthedocs.org/en/latest/rich_content_extraction.html
    # also: http://django-haystack.readthedocs.org/en/latest/searchindex_api.html
    def prepare(self, data_set):
        data = super(DataSetIndex, self).prepare(data_set)
        
        investigation = data_set.get_investigation()
        
        nodes = []
        
        # TODO: optimize this query
        if investigation is not None:
            studies = investigation.study_set.all()
            for study in studies:
                assays = study.assay_set.all()
                for assay in assays:
                    node_types = get_node_types(study.uuid, assay.uuid, files_only=True, filter_set=Node.FILES)            
                    for node_type in node_types:
                        nodes = nodes + list( AnnotatedNode.objects.filter( node_type=node_type, study=study, assay=assay ).values() )
            
            #for node in nodes:
            #    print node["node_name"] + " " + node["attribute_type"] + " " + node["attribute_value"]
        
            # perform the template processing to render the
            # text field with *all* of our node data visible for indexing
            t = loader.select_template(('search/indexes/core/dataset_text.txt', ))
            data['text'] = t.render(Context({'object': data_set,
                                             'nodes': nodes}))
    
        return data



class ProjectIndex(indexes.SearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, use_template=True)
    owner_id = indexes.CharField() # id of the user who owns this project
    group_ids = indexes.MultiValueField(null=True) # ids of the groups who have read permission for this data set
    name = indexes.CharField(model_attr='name', null=True )
    uuid = indexes.CharField(model_attr='uuid')
    summary = indexes.CharField(model_attr='summary')    
    description = indexes.CharField(model_attr='description', null=True)    
    creation_date = indexes.DateTimeField(model_attr='creation_date' )
    modification_date = indexes.DateTimeField(model_attr='modification_date' )

    # We add this for autocomplete.
    content_auto = indexes.EdgeNgramField(model_attr='name')
    #content_auto = indexes.EdgeNgramField(model_attr='summary')

    def get_model(self):
        return Project

    def prepare_owner_id(self, object):
        return object.get_owner().id

    def prepare_group_ids(self, object):
<<<<<<< HEAD
        return [ g["group"] for g in object.get_groups() ]
=======
        return [ g["id"] for g in object.get_groups() ]
>>>>>>> 364d16d401b820e8c71632a16caab1f1d62e90b9

    def index_queryset(self):
        """Used when the entire index for model is updated."""
        return self.get_model().objects.all().exclude( is_catch_all=True )
    
    