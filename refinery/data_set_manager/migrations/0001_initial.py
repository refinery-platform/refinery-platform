# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'NodeCollection'
        db.create_table('data_set_manager_nodecollection', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('uuid', self.gf('django.db.models.fields.CharField')(unique=True, max_length=36, blank=True)),
            ('identifier', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('title', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('description', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('submission_date', self.gf('django.db.models.fields.DateField')(null=True, blank=True)),
            ('release_date', self.gf('django.db.models.fields.DateField')(null=True, blank=True)),
        ))
        db.send_create_signal('data_set_manager', ['NodeCollection'])

        # Adding model 'Publication'
        db.create_table('data_set_manager_publication', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('collection', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.NodeCollection'])),
            ('title', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('authors', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('pubmed_id', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('doi', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('status', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('status_accession', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('status_source', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal('data_set_manager', ['Publication'])

        # Adding model 'Contact'
        db.create_table('data_set_manager_contact', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('collection', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.NodeCollection'])),
            ('last_name', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('first_name', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('middle_initials', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('email', self.gf('django.db.models.fields.EmailField')(max_length=75, null=True, blank=True)),
            ('phone', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('fax', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('address', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('affiliation', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('roles', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('roles_accession', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('roles_source', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal('data_set_manager', ['Contact'])

        # Adding model 'Investigation'
        db.create_table('data_set_manager_investigation', (
            ('nodecollection_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['data_set_manager.NodeCollection'], unique=True, primary_key=True)),
            ('isarchive_file', self.gf('django.db.models.fields.CharField')(max_length=36, null=True, blank=True)),
            ('pre_isarchive_file', self.gf('django.db.models.fields.CharField')(max_length=36, null=True, blank=True)),
        ))
        db.send_create_signal('data_set_manager', ['Investigation'])

        # Adding model 'Ontology'
        db.create_table('data_set_manager_ontology', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('investigation', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Investigation'])),
            ('name', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('file_name', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('version', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('description', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal('data_set_manager', ['Ontology'])

        # Adding model 'Study'
        db.create_table('data_set_manager_study', (
            ('nodecollection_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['data_set_manager.NodeCollection'], unique=True, primary_key=True)),
            ('investigation', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Investigation'])),
            ('file_name', self.gf('django.db.models.fields.TextField')()),
        ))
        db.send_create_signal('data_set_manager', ['Study'])

        # Adding model 'Design'
        db.create_table('data_set_manager_design', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('study', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Study'])),
            ('type', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('type_accession', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('type_source', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal('data_set_manager', ['Design'])

        # Adding model 'Factor'
        db.create_table('data_set_manager_factor', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('study', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Study'])),
            ('name', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('type', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('type_accession', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('type_source', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal('data_set_manager', ['Factor'])

        # Adding model 'Assay'
        db.create_table('data_set_manager_assay', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('uuid', self.gf('django.db.models.fields.CharField')(unique=True, max_length=36, blank=True)),
            ('study', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Study'])),
            ('measurement', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('measurement_accession', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('measurement_source', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('technology', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('technology_accession', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('technology_source', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('platform', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('file_name', self.gf('django.db.models.fields.TextField')()),
        ))
        db.send_create_signal('data_set_manager', ['Assay'])

        # Adding model 'Protocol'
        db.create_table('data_set_manager_protocol', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('study', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Study'])),
            ('uuid', self.gf('django.db.models.fields.CharField')(unique=True, max_length=36, blank=True)),
            ('workflow_uuid', self.gf('django.db.models.fields.CharField')(unique=True, max_length=36, blank=True)),
            ('version', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('name', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('name_accession', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('name_source', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('type', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('type_accession', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('type_source', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('description', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('uri', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal('data_set_manager', ['Protocol'])

        # Adding model 'ProtocolParameter'
        db.create_table('data_set_manager_protocolparameter', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('study', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Study'])),
            ('protocol', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Protocol'])),
            ('name', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('name_accession', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('name_source', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal('data_set_manager', ['ProtocolParameter'])

        # Adding model 'ProtocolComponent'
        db.create_table('data_set_manager_protocolcomponent', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('study', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Study'])),
            ('protocol', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Protocol'])),
            ('name', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('type', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('type_accession', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('type_source', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal('data_set_manager', ['ProtocolComponent'])

        # Adding model 'Node'
        db.create_table('data_set_manager_node', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('uuid', self.gf('django.db.models.fields.CharField')(unique=True, max_length=36, blank=True)),
            ('study', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Study'])),
            ('assay', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Assay'], null=True, blank=True)),
            ('type', self.gf('django.db.models.fields.TextField')(db_index=True)),
            ('name', self.gf('django.db.models.fields.TextField')(db_index=True)),
            ('file_uuid', self.gf('django.db.models.fields.CharField')(default=None, max_length=36, null=True, blank=True)),
            ('genome_build', self.gf('django.db.models.fields.TextField')(null=True, db_index=True)),
            ('species', self.gf('django.db.models.fields.IntegerField')(null=True, db_index=True)),
            ('is_annotation', self.gf('django.db.models.fields.BooleanField')(default=False)),
        ))
        db.send_create_signal('data_set_manager', ['Node'])

        # Adding M2M table for field children on 'Node'
        db.create_table('data_set_manager_node_children', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('from_node', models.ForeignKey(orm['data_set_manager.node'], null=False)),
            ('to_node', models.ForeignKey(orm['data_set_manager.node'], null=False))
        ))
        db.create_unique('data_set_manager_node_children', ['from_node_id', 'to_node_id'])

        # Adding M2M table for field parents on 'Node'
        db.create_table('data_set_manager_node_parents', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('from_node', models.ForeignKey(orm['data_set_manager.node'], null=False)),
            ('to_node', models.ForeignKey(orm['data_set_manager.node'], null=False))
        ))
        db.create_unique('data_set_manager_node_parents', ['from_node_id', 'to_node_id'])

        # Adding model 'Attribute'
        db.create_table('data_set_manager_attribute', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('node', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Node'])),
            ('type', self.gf('django.db.models.fields.TextField')(db_index=True)),
            ('subtype', self.gf('django.db.models.fields.TextField')(db_index=True, null=True, blank=True)),
            ('value', self.gf('django.db.models.fields.TextField')(db_index=True, null=True, blank=True)),
            ('value_unit', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('value_accession', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('value_source', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal('data_set_manager', ['Attribute'])

        # Adding model 'AttributeDefinition'
        db.create_table('data_set_manager_attributedefinition', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('study', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Study'])),
            ('assay', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Assay'], null=True, blank=True)),
            ('type', self.gf('django.db.models.fields.TextField')(db_index=True)),
            ('subtype', self.gf('django.db.models.fields.TextField')(db_index=True, null=True, blank=True)),
            ('value', self.gf('django.db.models.fields.TextField')(db_index=True, null=True, blank=True)),
            ('definition', self.gf('django.db.models.fields.TextField')(db_index=True, null=True, blank=True)),
            ('value_accession', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('value_source', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal('data_set_manager', ['AttributeDefinition'])

        # Adding model 'AttributeOrder'
        db.create_table('data_set_manager_attributeorder', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('study', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Study'])),
            ('assay', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Assay'], null=True, blank=True)),
            ('solr_field', self.gf('django.db.models.fields.TextField')(db_index=True)),
            ('rank', self.gf('django.db.models.fields.IntegerField')(null=True, blank=True)),
            ('is_exposed', self.gf('django.db.models.fields.BooleanField')(default=True)),
            ('is_facet', self.gf('django.db.models.fields.BooleanField')(default=True)),
            ('is_active', self.gf('django.db.models.fields.BooleanField')(default=True)),
            ('is_internal', self.gf('django.db.models.fields.BooleanField')(default=False)),
        ))
        db.send_create_signal('data_set_manager', ['AttributeOrder'])

        # Adding model 'AnnotatedNodeRegistry'
        db.create_table('data_set_manager_annotatednoderegistry', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('study', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Study'])),
            ('assay', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Assay'], null=True, blank=True)),
            ('node_type', self.gf('django.db.models.fields.TextField')(db_index=True)),
            ('creation_date', self.gf('django.db.models.fields.DateTimeField')(auto_now_add=True, blank=True)),
            ('modification_date', self.gf('django.db.models.fields.DateTimeField')(auto_now=True, blank=True)),
        ))
        db.send_create_signal('data_set_manager', ['AnnotatedNodeRegistry'])

        # Adding model 'AnnotatedNode'
        db.create_table('data_set_manager_annotatednode', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('node', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Node'])),
            ('attribute', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Attribute'])),
            ('study', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Study'])),
            ('assay', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Assay'], null=True, blank=True)),
            ('node_uuid', self.gf('django.db.models.fields.CharField')(max_length=36, blank=True)),
            ('node_file_uuid', self.gf('django.db.models.fields.CharField')(max_length=36, null=True, blank=True)),
            ('node_type', self.gf('django.db.models.fields.TextField')(db_index=True)),
            ('node_name', self.gf('django.db.models.fields.TextField')(db_index=True)),
            ('attribute_type', self.gf('django.db.models.fields.TextField')(db_index=True)),
            ('attribute_subtype', self.gf('django.db.models.fields.TextField')(db_index=True, null=True, blank=True)),
            ('attribute_value', self.gf('django.db.models.fields.TextField')(db_index=True, null=True, blank=True)),
            ('attribute_value_unit', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('node_species', self.gf('django.db.models.fields.IntegerField')(null=True, db_index=True)),
            ('node_genome_build', self.gf('django.db.models.fields.TextField')(null=True, db_index=True)),
            ('is_annotation', self.gf('django.db.models.fields.BooleanField')(default=False)),
        ))
        db.send_create_signal('data_set_manager', ['AnnotatedNode'])

        # Adding model 'ProtocolReference'
        db.create_table('data_set_manager_protocolreference', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('node', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Node'])),
            ('protocol', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Protocol'])),
            ('performer', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('performer_uuid', self.gf('django.db.models.fields.CharField')(max_length=36, null=True, blank=True)),
            ('date', self.gf('django.db.models.fields.DateField')(null=True, blank=True)),
            ('comment', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal('data_set_manager', ['ProtocolReference'])

        # Adding model 'ProtocolReferenceParameter'
        db.create_table('data_set_manager_protocolreferenceparameter', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('protocol_reference', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.ProtocolReference'])),
            ('name', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('value', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('value_unit', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('value_accession', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('value_source', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal('data_set_manager', ['ProtocolReferenceParameter'])


    def backwards(self, orm):
        # Deleting model 'NodeCollection'
        db.delete_table('data_set_manager_nodecollection')

        # Deleting model 'Publication'
        db.delete_table('data_set_manager_publication')

        # Deleting model 'Contact'
        db.delete_table('data_set_manager_contact')

        # Deleting model 'Investigation'
        db.delete_table('data_set_manager_investigation')

        # Deleting model 'Ontology'
        db.delete_table('data_set_manager_ontology')

        # Deleting model 'Study'
        db.delete_table('data_set_manager_study')

        # Deleting model 'Design'
        db.delete_table('data_set_manager_design')

        # Deleting model 'Factor'
        db.delete_table('data_set_manager_factor')

        # Deleting model 'Assay'
        db.delete_table('data_set_manager_assay')

        # Deleting model 'Protocol'
        db.delete_table('data_set_manager_protocol')

        # Deleting model 'ProtocolParameter'
        db.delete_table('data_set_manager_protocolparameter')

        # Deleting model 'ProtocolComponent'
        db.delete_table('data_set_manager_protocolcomponent')

        # Deleting model 'Node'
        db.delete_table('data_set_manager_node')

        # Removing M2M table for field children on 'Node'
        db.delete_table('data_set_manager_node_children')

        # Removing M2M table for field parents on 'Node'
        db.delete_table('data_set_manager_node_parents')

        # Deleting model 'Attribute'
        db.delete_table('data_set_manager_attribute')

        # Deleting model 'AttributeDefinition'
        db.delete_table('data_set_manager_attributedefinition')

        # Deleting model 'AttributeOrder'
        db.delete_table('data_set_manager_attributeorder')

        # Deleting model 'AnnotatedNodeRegistry'
        db.delete_table('data_set_manager_annotatednoderegistry')

        # Deleting model 'AnnotatedNode'
        db.delete_table('data_set_manager_annotatednode')

        # Deleting model 'ProtocolReference'
        db.delete_table('data_set_manager_protocolreference')

        # Deleting model 'ProtocolReferenceParameter'
        db.delete_table('data_set_manager_protocolreferenceparameter')


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
            'node_file_uuid': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'}),
            'node_genome_build': ('django.db.models.fields.TextField', [], {'null': 'True', 'db_index': 'True'}),
            'node_name': ('django.db.models.fields.TextField', [], {'db_index': 'True'}),
            'node_species': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'db_index': 'True'}),
            'node_type': ('django.db.models.fields.TextField', [], {'db_index': 'True'}),
            'node_uuid': ('django.db.models.fields.CharField', [], {'max_length': '36', 'blank': 'True'}),
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
            'type': ('django.db.models.fields.TextField', [], {'db_index': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
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