# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'AnalysisStatus'
        db.create_table('analysis_manager_analysisstatus', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('analysis', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['core.Analysis'])),
            ('preprocessing_taskset_id', self.gf('django.db.models.fields.CharField')(max_length=36, null=True, blank=True)),
            ('execution_taskset_id', self.gf('django.db.models.fields.CharField')(max_length=36, null=True, blank=True)),
            ('postprocessing_taskset_id', self.gf('django.db.models.fields.CharField')(max_length=36, null=True, blank=True)),
            ('cleanup_taskset_id', self.gf('django.db.models.fields.CharField')(max_length=36, null=True, blank=True)),
            ('execution_monitor_task_id', self.gf('django.db.models.fields.CharField')(max_length=36, null=True, blank=True)),
        ))
        db.send_create_signal('analysis_manager', ['AnalysisStatus'])


    def backwards(self, orm):
        # Deleting model 'AnalysisStatus'
        db.delete_table('analysis_manager_analysisstatus')


    models = {
        'analysis_manager.analysisstatus': {
            'Meta': {'object_name': 'AnalysisStatus'},
            'analysis': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['core.Analysis']"}),
            'cleanup_taskset_id': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'}),
            'execution_monitor_task_id': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'}),
            'execution_taskset_id': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'postprocessing_taskset_id': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'}),
            'preprocessing_taskset_id': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'})
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
        'core.investigationlink': {
            'Meta': {'object_name': 'InvestigationLink'},
            'data_set': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['core.DataSet']"}),
            'date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'investigation': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['data_set_manager.Investigation']"}),
            'message': ('django.db.models.fields.CharField', [], {'max_length': '500', 'null': 'True', 'blank': 'True'}),
            'version': ('django.db.models.fields.IntegerField', [], {'default': '1'})
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
        'core.workflow': {
            'Meta': {'unique_together': "(('internal_id', 'workflow_engine'),)", 'object_name': 'Workflow'},
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'data_inputs': ('django.db.models.fields.related.ManyToManyField', [], {'to': "orm['core.WorkflowDataInput']", 'symmetrical': 'False', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
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
        'data_set_manager.investigation': {
            'Meta': {'object_name': 'Investigation', '_ormbases': ['data_set_manager.NodeCollection']},
            'isarchive_file': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'}),
            'nodecollection_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': "orm['data_set_manager.NodeCollection']", 'unique': 'True', 'primary_key': 'True'}),
            'pre_isarchive_file': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'})
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
        'galaxy_connector.instance': {
            'Meta': {'object_name': 'Instance'},
            'api_key': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            'api_url': ('django.db.models.fields.CharField', [], {'default': "'api'", 'max_length': '100'}),
            'base_url': ('django.db.models.fields.CharField', [], {'max_length': '2000'}),
            'data_url': ('django.db.models.fields.CharField', [], {'default': "'datasets'", 'max_length': '100'}),
            'description': ('django.db.models.fields.CharField', [], {'max_length': '500'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'})
        }
    }

    complete_apps = ['analysis_manager']