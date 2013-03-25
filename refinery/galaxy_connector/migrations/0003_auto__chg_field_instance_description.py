# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):

        # Changing field 'Instance.description'
        db.alter_column('galaxy_connector_instance', 'description', self.gf('django.db.models.fields.CharField')(max_length=500, null=True))

    def backwards(self, orm):

        # Changing field 'Instance.description'
        db.alter_column('galaxy_connector_instance', 'description', self.gf('django.db.models.fields.CharField')(default='', max_length=500))

    models = {
        'galaxy_connector.instance': {
            'Meta': {'object_name': 'Instance'},
            'api_key': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            'api_url': ('django.db.models.fields.CharField', [], {'default': "'api'", 'max_length': '100'}),
            'base_url': ('django.db.models.fields.CharField', [], {'max_length': '2000'}),
            'data_url': ('django.db.models.fields.CharField', [], {'default': "'datasets'", 'max_length': '100'}),
            'description': ('django.db.models.fields.CharField', [], {'default': "''", 'max_length': '500', 'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'local_download': ('django.db.models.fields.BooleanField', [], {'default': 'False'})
        }
    }

    complete_apps = ['galaxy_connector']