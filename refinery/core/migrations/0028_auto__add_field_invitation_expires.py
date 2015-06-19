# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding field 'Invitation.expires'
        db.add_column(u'core_invitation', 'expires',
                      self.gf('django.db.models.fields.DateTimeField')(null=True),
                      keep_default=False)


    def backwards(self, orm):
        # Deleting field 'Invitation.expires'
        db.delete_column(u'core_invitation', 'expires')


    models = {
        u'auth.group': {
            'Meta': {'object_name': 'Group'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '80'}),
            'permissions': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Permission']", 'symmetrical': 'False', 'blank': 'True'})
        },
        u'auth.permission': {
            'Meta': {'ordering': "(u'content_type__app_label', u'content_type__model', u'codename')", 'unique_together': "((u'content_type', u'codename'),)", 'object_name': 'Permission'},
            'codename': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'content_type': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['contenttypes.ContentType']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '50'})
        },
        u'auth.user': {
            'Meta': {'object_name': 'User'},
            'date_joined': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'email': ('django.db.models.fields.EmailField', [], {'max_length': '75', 'blank': 'True'}),
            'first_name': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'groups': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Group']", 'symmetrical': 'False', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_active': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'is_staff': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'is_superuser': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'last_login': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'last_name': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'password': ('django.db.models.fields.CharField', [], {'max_length': '128'}),
            'user_permissions': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Permission']", 'symmetrical': 'False', 'blank': 'True'}),
            'username': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '30'})
        },
        u'contenttypes.contenttype': {
            'Meta': {'ordering': "('name',)", 'unique_together': "(('app_label', 'model'),)", 'object_name': 'ContentType', 'db_table': "'django_content_type'"},
            'app_label': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'model': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'})
        },
        u'core.analysis': {
            'Meta': {'object_name': 'Analysis'},
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'data_set': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['core.DataSet']", 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            'history_id': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'library_id': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
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
        u'core.analysisnodeconnection': {
            'Meta': {'object_name': 'AnalysisNodeConnection'},
            'analysis': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'workflow_node_connections'", 'to': u"orm['core.Analysis']"}),
            'direction': ('django.db.models.fields.CharField', [], {'max_length': '3'}),
            'filename': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'filetype': ('django.db.models.fields.CharField', [], {'max_length': '100', 'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_refinery_file': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'node': ('django.db.models.fields.related.ForeignKey', [], {'default': 'None', 'related_name': "'workflow_node_connections'", 'null': 'True', 'blank': 'True', 'to': u"orm['data_set_manager.Node']"}),
            'step': ('django.db.models.fields.IntegerField', [], {}),
            'subanalysis': ('django.db.models.fields.IntegerField', [], {'null': 'True'})
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
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'core.diskquota': {
            'Meta': {'object_name': 'DiskQuota'},
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'current': ('django.db.models.fields.IntegerField', [], {}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'maximum': ('django.db.models.fields.IntegerField', [], {}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'core.download': {
            'Meta': {'object_name': 'Download'},
            'analysis': ('django.db.models.fields.related.ForeignKey', [], {'default': 'None', 'to': u"orm['core.Analysis']", 'null': 'True'}),
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'data_set': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['core.DataSet']"}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            'file_store_item': ('django.db.models.fields.related.ForeignKey', [], {'default': 'None', 'to': u"orm['file_store.FileStoreItem']", 'null': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'core.extendedgroup': {
            'Meta': {'object_name': 'ExtendedGroup', '_ormbases': [u'auth.Group']},
            u'group_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['auth.Group']", 'unique': 'True', 'primary_key': 'True'}),
            'is_public': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'manager_group': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'managed_group'", 'null': 'True', 'to': u"orm['core.ExtendedGroup']"}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'core.externaltoolstatus': {
            'Meta': {'unique_together': "(('name', 'unique_instance_identifier'),)", 'object_name': 'ExternalToolStatus'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_active': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'last_time_check': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'status': ('django.db.models.fields.TextField', [], {'default': "'UNKNOWN'", 'null': 'True', 'blank': 'True'}),
            'unique_instance_identifier': ('django.db.models.fields.CharField', [], {'default': 'None', 'max_length': '256', 'null': 'True', 'blank': 'True'})
        },
        u'core.investigationlink': {
            'Meta': {'unique_together': "(('data_set', 'investigation', 'version'),)", 'object_name': 'InvestigationLink'},
            'data_set': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['core.DataSet']"}),
            'date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'investigation': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['data_set_manager.Investigation']"}),
            'message': ('django.db.models.fields.CharField', [], {'max_length': '500', 'null': 'True', 'blank': 'True'}),
            'version': ('django.db.models.fields.IntegerField', [], {'default': '1'})
        },
        u'core.invitation': {
            'Meta': {'object_name': 'Invitation'},
            'created': ('django.db.models.fields.DateTimeField', [], {'null': 'True'}),
            'expires': ('django.db.models.fields.DateTimeField', [], {'null': 'True'}),
            'group_id': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'token_uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'core.nodepair': {
            'Meta': {'object_name': 'NodePair'},
            'group': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'node1': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'node1'", 'to': u"orm['data_set_manager.Node']"}),
            'node2': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'node2'", 'null': 'True', 'to': u"orm['data_set_manager.Node']"}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'core.noderelationship': {
            'Meta': {'object_name': 'NodeRelationship'},
            'assay': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['data_set_manager.Assay']"}),
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_current': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            'node_pairs': ('django.db.models.fields.related.ManyToManyField', [], {'blank': 'True', 'related_name': "'node_pairs'", 'null': 'True', 'symmetrical': 'False', 'to': u"orm['core.NodePair']"}),
            'node_set_1': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'node_set_1'", 'null': 'True', 'to': u"orm['core.NodeSet']"}),
            'node_set_2': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'node_set_2'", 'null': 'True', 'to': u"orm['core.NodeSet']"}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['data_set_manager.Study']"}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'type': ('django.db.models.fields.CharField', [], {'max_length': '15', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'core.nodeset': {
            'Meta': {'object_name': 'NodeSet'},
            'assay': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['data_set_manager.Assay']"}),
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_current': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'is_implicit': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            'node_count': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'solr_query': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'solr_query_components': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['data_set_manager.Study']"}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'core.project': {
            'Meta': {'object_name': 'Project'},
            'creation_date': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '5000', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_catch_all': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'modification_date': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            'slug': ('django.db.models.fields.CharField', [], {'max_length': '250', 'null': 'True', 'blank': 'True'}),
            'summary': ('django.db.models.fields.CharField', [], {'max_length': '1000', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'core.userprofile': {
            'Meta': {'object_name': 'UserProfile'},
            'affiliation': ('django.db.models.fields.CharField', [], {'max_length': '100', 'blank': 'True'}),
            'catch_all_project': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['core.Project']", 'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_public': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'user': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['auth.User']", 'unique': 'True'}),
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
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
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
            'name': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
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
        u'data_set_manager.assay': {
            'Meta': {'object_name': 'Assay'},
            'file_name': ('django.db.models.fields.TextField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'measurement': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'measurement_accession': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'measurement_source': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'platform': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['data_set_manager.Study']"}),
            'technology': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'technology_accession': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'technology_source': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'data_set_manager.investigation': {
            'Meta': {'object_name': 'Investigation', '_ormbases': [u'data_set_manager.NodeCollection']},
            'isarchive_file': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'}),
            u'nodecollection_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['data_set_manager.NodeCollection']", 'unique': 'True', 'primary_key': 'True'}),
            'pre_isarchive_file': ('django.db.models.fields.CharField', [], {'max_length': '36', 'null': 'True', 'blank': 'True'})
        },
        u'data_set_manager.node': {
            'Meta': {'object_name': 'Node'},
            'analysis_uuid': ('django.db.models.fields.CharField', [], {'default': 'None', 'max_length': '36', 'null': 'True', 'blank': 'True'}),
            'assay': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['data_set_manager.Assay']", 'null': 'True', 'blank': 'True'}),
            'children': ('django.db.models.fields.related.ManyToManyField', [], {'related_name': "'parents_set'", 'symmetrical': 'False', 'to': u"orm['data_set_manager.Node']"}),
            'file_uuid': ('django.db.models.fields.CharField', [], {'default': 'None', 'max_length': '36', 'null': 'True', 'blank': 'True'}),
            'genome_build': ('django.db.models.fields.TextField', [], {'null': 'True', 'db_index': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_annotation': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'name': ('django.db.models.fields.TextField', [], {'db_index': 'True'}),
            'parents': ('django.db.models.fields.related.ManyToManyField', [], {'related_name': "'children_set'", 'symmetrical': 'False', 'to': u"orm['data_set_manager.Node']"}),
            'species': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'db_index': 'True'}),
            'study': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['data_set_manager.Study']"}),
            'subanalysis': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'type': ('django.db.models.fields.TextField', [], {'db_index': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'}),
            'workflow_output': ('django.db.models.fields.CharField', [], {'max_length': '100', 'null': 'True'})
        },
        u'data_set_manager.nodecollection': {
            'Meta': {'object_name': 'NodeCollection'},
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'identifier': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'release_date': ('django.db.models.fields.DateField', [], {'null': 'True', 'blank': 'True'}),
            'submission_date': ('django.db.models.fields.DateField', [], {'null': 'True', 'blank': 'True'}),
            'title': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'data_set_manager.study': {
            'Meta': {'object_name': 'Study', '_ormbases': [u'data_set_manager.NodeCollection']},
            'file_name': ('django.db.models.fields.TextField', [], {}),
            'investigation': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['data_set_manager.Investigation']"}),
            u'nodecollection_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['data_set_manager.NodeCollection']", 'unique': 'True', 'primary_key': 'True'})
        },
        u'file_store.filestoreitem': {
            'Meta': {'object_name': 'FileStoreItem'},
            'datafile': ('django.db.models.fields.files.FileField', [], {'max_length': '1024', 'blank': 'True'}),
            'filetype': ('django.db.models.fields.CharField', [], {'max_length': '15', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'import_task_id': ('django.db.models.fields.CharField', [], {'max_length': '36', 'blank': 'True'}),
            'sharename': ('django.db.models.fields.CharField', [], {'max_length': '20', 'blank': 'True'}),
            'source': ('django.db.models.fields.CharField', [], {'max_length': '1024'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
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

    complete_apps = ['core']