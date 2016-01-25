# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):

        # Changing field 'AnalysisStatus.galaxy_history_state'
        db.alter_column(u'analysis_manager_analysisstatus', 'galaxy_history_state', self.gf('django.db.models.fields.CharField')(max_length=10))

    def backwards(self, orm):

        # Changing field 'AnalysisStatus.galaxy_history_state'
        db.alter_column(u'analysis_manager_analysisstatus', 'galaxy_history_state', self.gf('django.db.models.fields.CharField')(max_length=7))

    models = {
        u'analysis_manager.analysisstatus': {
            'Meta': {'object_name': 'AnalysisStatus'},
            'analysis': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['core.Analysis']"}),
            'galaxy_export_task_group_id': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'}),
            'galaxy_history_progress': ('django.db.models.fields.PositiveSmallIntegerField', [], {'null': 'True', 'blank': 'True'}),
            'galaxy_history_state': ('django.db.models.fields.CharField', [], {'max_length': '10', 'blank': 'True'}),
            'galaxy_import_task_group_id': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'refinery_import_task_group_id': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'})
        },
        u'core.analysis': {
            'Meta': {'ordering': "['-time_end', '-time_start']", 'object_name': 'Analysis'},
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'data_set': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['core.DataSet']", 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            'history_id': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'library_id': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True'}),
            'project': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'analyses'", 'to': u"orm['core.Project']"}),
            'results': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['core.AnalysisResult']", 'symmetrical': 'False', 'blank': 'True'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'status': ('django.db.models.fields.TextField', [], {'default': "'INITIALIZED'", 'null': 'True', 'blank': 'True'}),
            'status_detail': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'time_end': ('django.db.models.fields.DateTimeField', [], {'null': 'True', 'blank': 'True'}),
            'time_start': ('django.db.models.fields.DateTimeField', [], {'null': 'True', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'}),
            'workflow': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['core.Workflow']", 'blank': 'True'}),
            'workflow_copy': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'workflow_data_input_maps': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['core.WorkflowDataInputMap']", 'symmetrical': 'False', 'blank': 'True'}),
            'workflow_dl_files': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['core.WorkflowFilesDL']", 'symmetrical': 'False', 'blank': 'True'}),
            'workflow_galaxy_id': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'workflow_steps_num': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'})
        },
        u'core.analysisresult': {
            'Meta': {'object_name': 'AnalysisResult'},
            'analysis_uuid': ('django.db.models.fields.CharField', [], {'max_length': '36'}),
            'file_name': ('django.db.models.fields.TextField', [], {}),
            'file_store_uuid': ('django.db.models.fields.CharField', [], {'max_length': '36'}),
            'file_type': ('django.db.models.fields.TextField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'})
        },
        u'core.dataset': {
            'Meta': {'object_name': 'DataSet'},
            'accession': ('django.db.models.fields.CharField', [], {'max_length': '32', 'null': 'True', 'blank': 'True'}),
            'accession_source': ('django.db.models.fields.CharField', [], {'max_length': '128', 'null': 'True', 'blank': 'True'}),
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            'file_count': ('django.db.models.fields.IntegerField', [], {'default': '0', 'null': 'True', 'blank': 'True'}),
            'file_size': ('django.db.models.fields.BigIntegerField', [], {'default': '0', 'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'title': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'core.project': {
            'Meta': {'object_name': 'Project'},
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_catch_all': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'core.workflow': {
            'Meta': {'object_name': 'Workflow'},
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'data_inputs': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['core.WorkflowDataInput']", 'symmetrical': 'False', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            'graph': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'input_relationships': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['core.WorkflowInputRelationships']", 'symmetrical': 'False', 'blank': 'True'}),
            'internal_id': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            'is_active': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True'}),
            'show_in_repository_mode': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'type': ('django.db.models.fields.CharField', [], {'default': "'analysis'", 'max_length': '25'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'}),
            'workflow_engine': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['core.WorkflowEngine']"})
        },
        u'core.workflowdatainput': {
            'Meta': {'object_name': 'WorkflowDataInput'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'internal_id': ('django.db.models.fields.IntegerField', [], {}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '200'})
        },
        u'core.workflowdatainputmap': {
            'Meta': {'object_name': 'WorkflowDataInputMap'},
            'data_uuid': ('django.db.models.fields.CharField', [], {'max_length': '36'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'pair_id': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            'workflow_data_input_name': ('django.db.models.fields.CharField', [], {'max_length': '200'})
        },
        u'core.workflowengine': {
            'Meta': {'object_name': 'WorkflowEngine'},
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'instance': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['galaxy_connector.Instance']", 'blank': 'True'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'core.workflowfilesdl': {
            'Meta': {'object_name': 'WorkflowFilesDL'},
            'filename': ('django.db.models.fields.TextField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'pair_id': ('django.db.models.fields.TextField', [], {}),
            'step_id': ('django.db.models.fields.TextField', [], {})
        },
        u'core.workflowinputrelationships': {
            'Meta': {'object_name': 'WorkflowInputRelationships'},
            'category': ('django.db.models.fields.CharField', [], {'max_length': '15', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'set1': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            'set2': ('django.db.models.fields.CharField', [], {'max_length': '50', 'null': 'True', 'blank': 'True'})
        },
        u'galaxy_connector.instance': {
            'Meta': {'object_name': 'Instance'},
            'api_key': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            'api_url': ('django.db.models.fields.CharField', [], {'default': "'api'", 'max_length': '100'}),
            'base_url': ('django.db.models.fields.CharField', [], {'max_length': '2000'}),
            'data_url': ('django.db.models.fields.CharField', [], {'default': "'datasets'", 'max_length': '100'}),
            'description': ('django.db.models.fields.CharField', [], {'default': "''", 'max_length': '500', 'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'local_download': ('django.db.models.fields.BooleanField', [], {'default': 'False'})
        }
    }

    complete_apps = ['analysis_manager']