'''
Created on Jul 2, 2012

@author: nils
'''


from core.models import DataSet
from data_set_manager.models import Node, AnnotatedNode
from data_set_manager.utils import get_node_types
from django.template import loader
from django.template.context import Context
from haystack import indexes
import datetime


class DataSetIndex(indexes.SearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, use_template=True)
    name = indexes.CharField(model_attr='name')
    summary = indexes.CharField(model_attr='summary')    
    creation_date = indexes.DateTimeField(model_attr='creation_date')
    modification_date = indexes.DateTimeField(model_attr='modification_date')

    def get_model(self):
        return DataSet

    def index_queryset(self):
        """Used when the entire index for model is updated."""
        return self.get_model().objects.filter(modification_date__lte=datetime.datetime.now())
    
    # from: http://django-haystack.readthedocs.org/en/latest/rich_content_extraction.html
    # also: http://django-haystack.readthedocs.org/en/latest/searchindex_api.html
    def prepare(self, data_set):
        data = super(DataSetIndex, self).prepare(data_set)
        
        investigation = data_set.get_investigation()
        
        nodes = []
        
        if investigation is not None:
            studies = investigation.study_set.all()
            for study in studies:
                assays = study.assay_set.all()
                for assay in assays:
                    node_types = get_node_types(study.uuid, assay.uuid, files_only=True, filter_set=Node.FILES)            
                    for node_type in node_types:
                        nodes = nodes + list( AnnotatedNode.objects.filter( node_type=node_type, study=study, assay=assay ).values() )
            
            for node in nodes:
                print node["node_name"] + " " + node["attribute_type"] + " " + node["attribute_value"]
        
            # Now we'll finally perform the template processing to render the
            # text field with *all* of our metadata visible for templating:
            t = loader.select_template(('search/indexes/core/dataset_text.txt', ))
            data['text'] = t.render(Context({'object': data_set,
                                             'nodes': nodes}))
    
        return data

