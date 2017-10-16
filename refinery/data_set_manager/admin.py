'''
Created on May 11, 2012

@author: nils
'''

from django.contrib import admin

from django_extensions.admin import ForeignKeyAutocompleteAdmin

from data_set_manager import models


class NodeAdmin(ForeignKeyAutocompleteAdmin):
    raw_id_fields = ("parents", "children")
    list_display = ["__unicode__", "file_uuid", "study", "assay",
                    "analysis_uuid", "name",
                    "subanalysis", "workflow_output", "genome_build",
                    "species", "is_auxiliary_node"]


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


admin.site.register(models.NodeCollection, NodeCollectionAdmin)
admin.site.register(models.Investigation, InvestigationAdmin)
admin.site.register(models.Study, StudyAdmin)
admin.site.register(models.Publication)
admin.site.register(models.Contact)
admin.site.register(models.Ontology)
admin.site.register(models.Design)
admin.site.register(models.Factor)
admin.site.register(models.Assay)
admin.site.register(models.Protocol)
admin.site.register(models.Node, NodeAdmin)
admin.site.register(models.Attribute)
admin.site.register(models.AttributeOrder)
admin.site.register(models.AttributeDefinition)
admin.site.register(models.AnnotatedNode, AnnotatedNodeAdmin)
admin.site.register(models.AnnotatedNodeRegistry)
