# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'Instance'
        db.create_table('galaxy_connector_instance', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('base_url', self.gf('django.db.models.fields.CharField')(max_length=2000)),
            ('data_url', self.gf('django.db.models.fields.CharField')(default='datasets', max_length=100)),
            ('api_url', self.gf('django.db.models.fields.CharField')(default='api', max_length=100)),
            ('api_key', self.gf('django.db.models.fields.CharField')(max_length=50)),
            ('description', self.gf('django.db.models.fields.CharField')(max_length=500)),
        ))
        db.send_create_signal('galaxy_connector', ['Instance'])


    def backwards(self, orm):
        # Deleting model 'Instance'
        db.delete_table('galaxy_connector_instance')


    models = {
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

    complete_apps = ['galaxy_connector']