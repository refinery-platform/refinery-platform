'''
Created on May 11, 2012

@author: nils
'''

from django.contrib import admin
from data_set_manager.models import *

admin.site.register(NodeCollection)
admin.site.register(Investigation)
admin.site.register(Study)
admin.site.register(Publication)
admin.site.register(Contact)
admin.site.register(Ontology)
admin.site.register(Design)
admin.site.register(Factor)
admin.site.register(Assay)
admin.site.register(Protocol)
admin.site.register(ProtocolReference)
admin.site.register(ProtocolReferenceParameter)
admin.site.register(Node)
admin.site.register(Attribute)
admin.site.register(AnnotatedNode)
admin.site.register(AnnotatedNodeRegistry)
