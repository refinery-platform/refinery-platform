'''
Created on May 11, 2012

@author: nils
'''

from django.contrib import admin
from django_extensions.admin import ForeignKeyAutocompleteAdmin

from data_set_manager.models import *


class NodeAdmin(ForeignKeyAutocompleteAdmin):
    raw_id_fields = ("parents", "children")
    list_display = ["__unicode__", "study", "assay", "analysis_uuid", "name",
                    "subanalysis", "workflow_output", "genome_build",
                    "species"]


class AnnotatedNodeAdmin(ForeignKeyAutocompleteAdmin):
    raw_id_fields = ("node", "attribute", "study", "assay")
    list_display = ["__unicode__", "id", "attribute", "study", "assay",
                    "node_uuid", "node_file_uuid", "node_type", "node_name",
                    "attribute_type", "attribute_subtype",
                    "attribute_value", "attribute_value_unit",
                    "node_species", "node_genome_build",
                    "node_analysis_uuid", "node_subanalysis",
                    "node_workflow_output", "is_annotation"]


class NodeCollectionAdmin(ForeignKeyAutocompleteAdmin):
    list_display = ["__unicode__", "title", "uuid", "identifier",
                    "description", "release_date", "submission_date"]


class InvestigationAdmin(ForeignKeyAutocompleteAdmin):
    list_display = ["__unicode__", "uuid"]


class StudyAdmin(ForeignKeyAutocompleteAdmin):
    list_display = ["__unicode__", "uuid"]


admin.site.register(NodeCollection, NodeCollectionAdmin)
admin.site.register(Investigation, InvestigationAdmin)
admin.site.register(Study, StudyAdmin)
admin.site.register(Publication)
admin.site.register(Contact)
admin.site.register(Ontology)
admin.site.register(Design)
admin.site.register(Factor)
admin.site.register(Assay)
admin.site.register(Protocol)
admin.site.register(ProtocolReference)
admin.site.register(ProtocolReferenceParameter)
admin.site.register(Node, NodeAdmin)
admin.site.register(Attribute)
admin.site.register(AttributeOrder)
admin.site.register(AttributeDefinition)
admin.site.register(AnnotatedNode, AnnotatedNodeAdmin)
admin.site.register(AnnotatedNodeRegistry)
