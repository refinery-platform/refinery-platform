'''
Created on May 11, 2012

@author: nils
'''

from data_set_manager.models import *
from django.contrib import admin
from django_extensions.admin import ForeignKeyAutocompleteAdmin

class NodeAdmin(ForeignKeyAutocompleteAdmin):
    raw_id_fields = ("parents","children")    

class AnnotatedNodeAdmin(ForeignKeyAutocompleteAdmin):
    raw_id_fields = ("node","attribute","study","assay")    

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
admin.site.register(Node,NodeAdmin)
admin.site.register(Attribute)
admin.site.register(AttributeOrder)
admin.site.register(AttributeDefinition)
admin.site.register(AnnotatedNode,AnnotatedNodeAdmin)
admin.site.register(AnnotatedNodeRegistry)

