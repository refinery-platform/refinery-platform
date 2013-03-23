# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding field 'Node.analysis_uuid'
        db.add_column('data_set_manager_node', 'analysis_uuid',
                      self.gf('django.db.models.fields.CharField')(default=None, max_length=36, null=True, blank=True),
                      keep_default=False)

        # Adding field 'Node.subanalysis'
        db.add_column('data_set_manager_node', 'subanalysis',
                      self.gf('django.db.models.fields.IntegerField')(null=True),
                      keep_default=False)

        # Adding field 'Node.workflow_output'
        db.add_column('data_set_manager_node', 'workflow_output',
                      self.gf('django.db.models.fields.CharField')(max_length=100, null=True),
                      keep_default=False)

        # Adding field 'AnnotatedNode.node_analysis_uuid'
        db.add_column('data_set_manager_annotatednode', 'node_analysis_uuid',
                      self.gf('django.db.models.fields.CharField')(default=None, max_length=36, null=True, blank=True),
                      keep_default=False)

        # Adding field 'AnnotatedNode.node_subanalysis'
        db.add_column('data_set_manager_annotatednode', 'node_subanalysis',
                      self.gf('django.db.models.fields.IntegerField')(null=True),
                      keep_default=False)

        # Adding field 'AnnotatedNode.node_workflow_output'
        db.add_column('data_set_manager_annotatednode', 'node_workflow_output',
                      self.gf('django.db.models.fields.CharField')(max_length=100, null=True),
                      keep_default=False)


    def backwards(self, orm):
        # Deleting field 'Node.analysis_uuid'
        db.delete_column('data_set_manager_node', 'analysis_uuid')

        # Deleting field 'Node.subanalysis'
        db.delete_column('data_set_manager_node', 'subanalysis')

        # Deleting field 'Node.workflow_output'
        db.delete_column('data_set_manager_node', 'workflow_output')

        # Deleting field 'AnnotatedNode.node_analysis_uuid'
        db.delete_column('data_set_manager_annotatednode', 'node_analysis_uuid')

        # Deleting field 'AnnotatedNode.node_subanalysis'
        db.delete_column('data_set_manager_annotatednode', 'node_subanalysis')

        # Deleting field 'AnnotatedNode.node_workflow_output'
        db.delete_column('data_set_manager_annotatednode', 'node_workflow_output')


    models = {
        'data_set_manager.annotatednode': {
            'Meta': {'object_name': 'AnnotatedNode'},
            'assay': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Assay']", 'null': 'True', 'blank': 'True'}),
            'attribute': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Attribute']"}),
            'attribute_subtype': ('django.db.models.fields.TextField', [], {'db_index': 'True', 'null': 'True', 'blank': 'True'}),
            'attribute_type': ('django.db.models.fields.TextField', [], {'db_index': 'True'}),
            'attribute_value': ('django.db.models.fields.TextField', [], {'db_index': 'True', 'null': 'True', 'blank': 'True'}),
            'attribute_value_unit': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_annotation': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'node': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Node']"}),
            'node_analysis_uuid': ('django.db.models.fields.CharField', [], {'default': 'None', 'max_length': '36', 'null': 'True', 'blank': 'True'}),
            'node_file_uuid': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'}),
            'node_genome_build': ('django.db.models.fields.TextField', [], {'null': 'True', 'db_index': 'True'}),
            'node_name': ('django.db.models.fields.TextField', [], {'db_index': 'True'}),
            'node_species': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'db_index': 'True'}),
            'node_subanalysis': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'node_type': ('django.db.models.fields.TextField', [], {'db_index': 'True'}),
            'node_uuid': ('django.db.models.fields.CharField', [], {'max_length': '36', 'blank': 'True'}),
            'node_workflow_output': ('django.db.models.fields.CharField', [], {'max_length': '100', 'null': 'True'}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Study']"})
        },
        'data_set_manager.annotatednoderegistry': {
            'Meta': {'object_name': 'AnnotatedNodeRegistry'},
            'assay': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Assay']", 'null': 'True', 'blank': 'True'}),
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'node_type': ('django.db.models.fields.TextField', [], {'db_index': 'True'}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Study']"})
        },
        'data_set_manager.assay': {
            'Meta': {'object_name': 'Assay'},
            'file_name': ('django.db.models.fields.TextField', [], {}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'measurement': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'measurement_accession': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'measurement_source': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'platform': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Study']"}),
            'technology': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'technology_accession': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'technology_source': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        'data_set_manager.attribute': {
            'Meta': {'object_name': 'Attribute'},
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'node': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Node']"}),
            'subtype': ('django.db.models.fields.TextField', [], {'db_index': 'True', 'null': 'True', 'blank': 'True'}),
            'type': ('django.db.models.fields.TextField', [], {'db_index': 'True'}),
            'value': ('django.db.models.fields.TextField', [], {'db_index': 'True', 'null': 'True', 'blank': 'True'}),
            'value_accession': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'value_source': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'value_unit': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'})
        },
        'data_set_manager.attributedefinition': {
            'Meta': {'object_name': 'AttributeDefinition'},
            'assay': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Assay']", 'null': 'True', 'blank': 'True'}),
            'definition': ('django.db.models.fields.TextField', [], {'db_index': 'True', 'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Study']"}),
            'subtype': ('django.db.models.fields.TextField', [], {'db_index': 'True', 'null': 'True', 'blank': 'True'}),
            'type': ('django.db.models.fields.TextField', [], {'db_index': 'True'}),
            'value': ('django.db.models.fields.TextField', [], {'db_index': 'True', 'null': 'True', 'blank': 'True'}),
            'value_accession': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'value_source': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'})
        },
        'data_set_manager.attributeorder': {
            'Meta': {'object_name': 'AttributeOrder'},
            'assay': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Assay']", 'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_active': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'is_exposed': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'is_facet': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'is_internal': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'rank': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            'solr_field': ('django.db.models.fields.TextField', [], {'db_index': 'True'}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Study']"})
        },
        'data_set_manager.contact': {
            'Meta': {'object_name': 'Contact'},
            'address': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'affiliation': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'collection': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.NodeCollection']"}),
            'email': ('django.db.models.fields.EmailField', [], {'max_length': '75', 'null': 'True', 'blank': 'True'}),
            'fax': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'first_name': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'last_name': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'middle_initials': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'phone': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'roles': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'roles_accession': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'roles_source': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'})
        },
        'data_set_manager.design': {
            'Meta': {'object_name': 'Design'},
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Study']"}),
            'type': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'type_accession': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'type_source': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'})
        },
        'data_set_manager.factor': {
            'Meta': {'object_name': 'Factor'},
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Study']"}),
            'type': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'type_accession': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'type_source': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'})
        },
        'data_set_manager.investigation': {
            'Meta': {'object_name': 'Investigation', '_ormbases': ['data_set_manager.NodeCollection']},
            'isarchive_file': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'}),
            'nodecollection_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': "orm['data_set_manager.NodeCollection']", 'unique': 'True', 'primary_key': 'True'}),
            'pre_isarchive_file': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'})
        },
        'data_set_manager.node': {
            'Meta': {'object_name': 'Node'},
            'analysis_uuid': ('django.db.models.fields.CharField', [], {'default': 'None', 'max_length': '36', 'null': 'True', 'blank': 'True'}),
            'assay': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Assay']", 'null': 'True', 'blank': 'True'}),
            'children': ('django.db.models.fields.related.ManyToManyField', [], {'related_name': "'parents_set'", 'symmetrical': 'False', 'to': "orm['data_set_manager.Node']"}),
            'file_uuid': ('django.db.models.fields.CharField', [], {'default': 'None', 'max_length': '36', 'null': 'True', 'blank': 'True'}),
            'genome_build': ('django.db.models.fields.TextField', [], {'null': 'True', 'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_annotation': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'name': ('django.db.models.fields.TextField', [], {'db_index': 'True'}),
            'parents': ('django.db.models.fields.related.ManyToManyField', [], {'related_name': "'children_set'", 'symmetrical': 'False', 'to': "orm['data_set_manager.Node']"}),
            'species': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'db_index': 'True'}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Study']"}),
            'subanalysis': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'type': ('django.db.models.fields.TextField', [], {'db_index': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'}),
            'workflow_output': ('django.db.models.fields.CharField', [], {'max_length': '100', 'null': 'True'})
        },
        'data_set_manager.nodecollection': {
            'Meta': {'object_name': 'NodeCollection'},
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'identifier': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'release_date': ('django.db.models.fields.DateField', [], {'null': 'True', 'blank': 'True'}),
            'submission_date': ('django.db.models.fields.DateField', [], {'null': 'True', 'blank': 'True'}),
            'title': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        'data_set_manager.ontology': {
            'Meta': {'object_name': 'Ontology'},
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'file_name': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'investigation': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Investigation']"}),
            'name': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'version': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'})
        },
        'data_set_manager.protocol': {
            'Meta': {'object_name': 'Protocol'},
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'name_accession': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'name_source': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Study']"}),
            'type': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'type_accession': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'type_source': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'uri': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'}),
            'version': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'workflow_uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        'data_set_manager.protocolcomponent': {
            'Meta': {'object_name': 'ProtocolComponent'},
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'protocol': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Protocol']"}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Study']"}),
            'type': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'type_accession': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'type_source': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'})
        },
        'data_set_manager.protocolparameter': {
            'Meta': {'object_name': 'ProtocolParameter'},
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'name_accession': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'name_source': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'protocol': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Protocol']"}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Study']"})
        },
        'data_set_manager.protocolreference': {
            'Meta': {'object_name': 'ProtocolReference'},
            'comment': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'date': ('django.db.models.fields.DateField', [], {'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'node': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Node']"}),
            'performer': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'performer_uuid': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'}),
            'protocol': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Protocol']"})
        },
        'data_set_manager.protocolreferenceparameter': {
            'Meta': {'object_name': 'ProtocolReferenceParameter'},
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'protocol_reference': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.ProtocolReference']"}),
            'value': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'value_accession': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'value_source': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'value_unit': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'})
        },
        'data_set_manager.publication': {
            'Meta': {'object_name': 'Publication'},
            'authors': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'collection': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.NodeCollection']"}),
            'doi': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'pubmed_id': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'status': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'status_accession': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'status_source': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'title': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'})
        },
        'data_set_manager.study': {
            'Meta': {'object_name': 'Study', '_ormbases': ['data_set_manager.NodeCollection']},
            'file_name': ('django.db.models.fields.TextField', [], {}),
            'investigation': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Investigation']"}),
            'nodecollection_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': "orm['data_set_manager.NodeCollection']", 'unique': 'True', 'primary_key': 'True'})
        }
    }

    complete_apps = ['data_set_manager']