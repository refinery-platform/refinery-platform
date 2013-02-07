# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'WorkflowInputRelationships'
        db.create_table('core_workflowinputrelationships', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('category', self.gf('django.db.models.fields.CharField')(max_length=15, blank=True)),
            ('set1', self.gf('django.db.models.fields.CharField')(max_length=50)),
            ('set2', self.gf('django.db.models.fields.CharField')(max_length=50, null=True, blank=True)),
        ))
        db.send_create_signal('core', ['WorkflowInputRelationships'])

        # Adding model 'NodePair'
        db.create_table('core_nodepair', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('uuid', self.gf('django.db.models.fields.CharField')(unique=True, max_length=36, blank=True)),
            ('node1', self.gf('django.db.models.fields.related.ForeignKey')(related_name='node1', to=orm['data_set_manager.Node'])),
            ('node2', self.gf('django.db.models.fields.related.ForeignKey')(blank=True, related_name='node2', null=True, to=orm['data_set_manager.Node'])),
            ('group', self.gf('django.db.models.fields.IntegerField')(null=True, blank=True)),
        ))
        db.send_create_signal('core', ['NodePair'])

        # Adding model 'NodeRelationship'
        db.create_table('core_noderelationship', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('uuid', self.gf('django.db.models.fields.CharField')(unique=True, max_length=36, blank=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=250)),
            ('summary', self.gf('django.db.models.fields.CharField')(max_length=1000, blank=True)),
            ('creation_date', self.gf('django.db.models.fields.DateTimeField')(auto_now_add=True, blank=True)),
            ('modification_date', self.gf('django.db.models.fields.DateTimeField')(auto_now=True, blank=True)),
            ('description', self.gf('django.db.models.fields.TextField')(max_length=5000, blank=True)),
            ('slug', self.gf('django.db.models.fields.CharField')(max_length=250, null=True, blank=True)),
            ('type', self.gf('django.db.models.fields.CharField')(max_length=15, blank=True)),
            ('node_set_1', self.gf('django.db.models.fields.related.ForeignKey')(blank=True, related_name='node_set_1', null=True, to=orm['core.NodeSet'])),
            ('node_set_2', self.gf('django.db.models.fields.related.ForeignKey')(blank=True, related_name='node_set_2', null=True, to=orm['core.NodeSet'])),
            ('study', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Study'])),
            ('assay', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['data_set_manager.Assay'])),
        ))
        db.send_create_signal('core', ['NodeRelationship'])

        # Adding M2M table for field node_pairs on 'NodeRelationship'
        db.create_table('core_noderelationship_node_pairs', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('noderelationship', models.ForeignKey(orm['core.noderelationship'], null=False)),
            ('nodepair', models.ForeignKey(orm['core.nodepair'], null=False))
        ))
        db.create_unique('core_noderelationship_node_pairs', ['noderelationship_id', 'nodepair_id'])

        # Adding M2M table for field input_relationships on 'Workflow'
        db.create_table('core_workflow_input_relationships', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('workflow', models.ForeignKey(orm['core.workflow'], null=False)),
            ('workflowinputrelationships', models.ForeignKey(orm['core.workflowinputrelationships'], null=False))
        ))
        db.create_unique('core_workflow_input_relationships', ['workflow_id', 'workflowinputrelationships_id'])


    def backwards(self, orm):
        # Deleting model 'WorkflowInputRelationships'
        db.delete_table('core_workflowinputrelationships')

        # Deleting model 'NodePair'
        db.delete_table('core_nodepair')

        # Deleting model 'NodeRelationship'
        db.delete_table('core_noderelationship')

        # Removing M2M table for field node_pairs on 'NodeRelationship'
        db.delete_table('core_noderelationship_node_pairs')

        # Removing M2M table for field input_relationships on 'Workflow'
        db.delete_table('core_workflow_input_relationships')


    models = {
        'auth.group': {
            'Meta': {'object_name': 'Group'},
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '80'}),
            'permissions': ('django.db.models.fields.related.ManyToManyField', [], {'to': "orm['auth.Permission']", 'symmetrical': 'False', 'blank': 'True'})
        },
        'auth.permission': {
            'Meta': {'ordering': "('content_type__app_label', 'content_type__model', 'codename')", 'unique_together': "(('content_type', 'codename'),)", 'object_name': 'Permission'},
            'codename': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'content_type': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['contenttypes.ContentType']"}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '50'})
        },
        'auth.user': {
            'Meta': {'object_name': 'User'},
            'date_joined': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'email': ('django.db.models.fields.EmailField', [], {'max_length': '75', 'blank': 'True'}),
            'first_name': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'groups': ('django.db.models.fields.related.ManyToManyField', [], {'to': "orm['auth.Group']", 'symmetrical': 'False', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_active': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'is_staff': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'is_superuser': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'last_login': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'last_name': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'password': ('django.db.models.fields.CharField', [], {'max_length': '128'}),
            'user_permissions': ('django.db.models.fields.related.ManyToManyField', [], {'to': "orm['auth.Permission']", 'symmetrical': 'False', 'blank': 'True'}),
            'username': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '30'})
        },
        'contenttypes.contenttype': {
            'Meta': {'ordering': "('name',)", 'unique_together': "(('app_label', 'model'),)", 'object_name': 'ContentType', 'db_table': "'django_content_type'"},
            'app_label': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'model': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'})
        },
        'core.analysis': {
            'Meta': {'object_name': 'Analysis'},
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'data_set': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['core.DataSet']", 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            'history_id': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'library_id': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            'project': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'analyses'", 'to': "orm['core.Project']"}),
            'results': ('django.db.models.fields.related.ManyToManyField', [], {'to': "orm['core.AnalysisResult']", 'symmetrical': 'False', 'blank': 'True'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'status': ('django.db.models.fields.TextField', [], {'default': "'INITIALIZED'", 'null': 'True', 'blank': 'True'}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'time_end': ('django.db.models.fields.DateTimeField', [], {'null': 'True', 'blank': 'True'}),
            'time_start': ('django.db.models.fields.DateTimeField', [], {'null': 'True', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'}),
            'workflow': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['core.Workflow']", 'blank': 'True'}),
            'workflow_copy': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'workflow_data_input_maps': ('django.db.models.fields.related.ManyToManyField', [], {'to': "orm['core.WorkflowDataInputMap']", 'symmetrical': 'False', 'blank': 'True'}),
            'workflow_dl_files': ('django.db.models.fields.related.ManyToManyField', [], {'to': "orm['core.WorkflowFilesDL']", 'symmetrical': 'False', 'blank': 'True'}),
            'workflow_galaxy_id': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'workflow_steps_num': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'})
        },
        'core.analysisresult': {
            'Meta': {'object_name': 'AnalysisResult'},
            'analysis_uuid': ('django.db.models.fields.CharField', [], {'max_length': '36'}),
            'file_name': ('django.db.models.fields.TextField', [], {}),
            'file_store_uuid': ('django.db.models.fields.CharField', [], {'max_length': '36'}),
            'file_type': ('django.db.models.fields.TextField', [], {}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'})
        },
        'core.dataset': {
            'Meta': {'object_name': 'DataSet'},
            '_investigations': ('django.db.models.fields.related.ManyToManyField', [], {'to': "orm['data_set_manager.Investigation']", 'through': "orm['core.InvestigationLink']", 'symmetrical': 'False'}),
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            'file_count': ('django.db.models.fields.IntegerField', [], {'default': '0', 'null': 'True', 'blank': 'True'}),
            'file_size': ('django.db.models.fields.BigIntegerField', [], {'default': '0', 'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        'core.diskquota': {
            'Meta': {'object_name': 'DiskQuota'},
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'current': ('django.db.models.fields.IntegerField', [], {}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'maximum': ('django.db.models.fields.IntegerField', [], {}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        'core.extendedgroup': {
            'Meta': {'object_name': 'ExtendedGroup', '_ormbases': ['auth.Group']},
            'group_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': "orm['auth.Group']", 'unique': 'True', 'primary_key': 'True'}),
            'is_public': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'manager_group': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'managed_group'", 'null': 'True', 'to': "orm['core.ExtendedGroup']"}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        'core.investigationlink': {
            'Meta': {'object_name': 'InvestigationLink'},
            'data_set': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['core.DataSet']"}),
            'date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'investigation': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Investigation']"}),
            'message': ('django.db.models.fields.CharField', [], {'max_length': '500', 'null': 'True', 'blank': 'True'}),
            'version': ('django.db.models.fields.IntegerField', [], {'default': '1'})
        },
        'core.nodepair': {
            'Meta': {'object_name': 'NodePair'},
            'group': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'node1': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'node1'", 'to': "orm['data_set_manager.Node']"}),
            'node2': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'node2'", 'null': 'True', 'to': "orm['data_set_manager.Node']"}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        'core.noderelationship': {
            'Meta': {'object_name': 'NodeRelationship'},
            'assay': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Assay']"}),
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            'node_pairs': ('django.db.models.fields.related.ManyToManyField', [], {'blank': 'True', 'related_name': "'node_pairs'", 'null': 'True', 'symmetrical': 'False', 'to': "orm['core.NodePair']"}),
            'node_set_1': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'node_set_1'", 'null': 'True', 'to': "orm['core.NodeSet']"}),
            'node_set_2': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'node_set_2'", 'null': 'True', 'to': "orm['core.NodeSet']"}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Study']"}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'type': ('django.db.models.fields.CharField', [], {'max_length': '15', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        'core.nodeset': {
            'Meta': {'object_name': 'NodeSet'},
            'assay': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Assay']"}),
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_implicit': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            'node_count': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'solr_query': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Study']"}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        'core.project': {
            'Meta': {'object_name': 'Project'},
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_catch_all': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        'core.userprofile': {
            'Meta': {'object_name': 'UserProfile'},
            'affiliation': ('django.db.models.fields.CharField', [], {'max_length': '100', 'blank': 'True'}),
            'catch_all_project': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['core.Project']", 'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_public': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'user': ('django.db.models.fields.related.OneToOneField', [], {'to': "orm['auth.User']", 'unique': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        'core.workflow': {
            'Meta': {'unique_together': "(('internal_id', 'workflow_engine'),)", 'object_name': 'Workflow'},
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'data_inputs': ('django.db.models.fields.related.ManyToManyField', [], {'to': "orm['core.WorkflowDataInput']", 'symmetrical': 'False', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'input_relationships': ('django.db.models.fields.related.ManyToManyField', [], {'to': "orm['core.WorkflowInputRelationships']", 'symmetrical': 'False', 'blank': 'True'}),
            'internal_id': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            'show_in_repository_mode': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'}),
            'workflow_engine': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['core.WorkflowEngine']"})
        },
        'core.workflowdatainput': {
            'Meta': {'object_name': 'WorkflowDataInput'},
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'internal_id': ('django.db.models.fields.IntegerField', [], {}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '200'})
        },
        'core.workflowdatainputmap': {
            'Meta': {'object_name': 'WorkflowDataInputMap'},
            'data_uuid': ('django.db.models.fields.CharField', [], {'max_length': '36'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'pair_id': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            'workflow_data_input_name': ('django.db.models.fields.CharField', [], {'max_length': '200'})
        },
        'core.workflowengine': {
            'Meta': {'object_name': 'WorkflowEngine'},
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'instance': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['galaxy_connector.Instance']", 'blank': 'True'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        'core.workflowfilesdl': {
            'Meta': {'object_name': 'WorkflowFilesDL'},
            'filename': ('django.db.models.fields.TextField', [], {}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'pair_id': ('django.db.models.fields.TextField', [], {}),
            'step_id': ('django.db.models.fields.TextField', [], {})
        },
        'core.workflowinputrelationships': {
            'Meta': {'object_name': 'WorkflowInputRelationships'},
            'category': ('django.db.models.fields.CharField', [], {'max_length': '15', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'set1': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            'set2': ('django.db.models.fields.CharField', [], {'max_length': '50', 'null': 'True', 'blank': 'True'})
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
        'data_set_manager.study': {
            'Meta': {'object_name': 'Study', '_ormbases': ['data_set_manager.NodeCollection']},
            'file_name': ('django.db.models.fields.TextField', [], {}),
            'investigation': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Investigation']"}),
            'nodecollection_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': "orm['data_set_manager.NodeCollection']", 'unique': 'True', 'primary_key': 'True'})
        },
        'galaxy_connector.instance': {
            'Meta': {'object_name': 'Instance'},
            'api_key': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            'api_url': ('django.db.models.fields.CharField', [], {'default': "'api'", 'max_length': '100'}),
            'base_url': ('django.db.models.fields.CharField', [], {'max_length': '2000'}),
            'data_url': ('django.db.models.fields.CharField', [], {'default': "'datasets'", 'max_length': '100'}),
            'description': ('django.db.models.fields.CharField', [], {'max_length': '500'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'local_download': ('django.db.models.fields.BooleanField', [], {'default': 'False'})
        }
    }

    complete_apps = ['core']