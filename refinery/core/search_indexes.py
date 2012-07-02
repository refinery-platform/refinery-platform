'''
Created on Jul 2, 2012

@author: nils
'''


from core.models import DataSet
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