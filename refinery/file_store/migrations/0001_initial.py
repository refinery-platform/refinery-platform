# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'FileStoreItem'
        db.create_table('file_store_filestoreitem', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('datafile', self.gf('django.db.models.fields.files.FileField')(max_length=1024, blank=True)),
            ('uuid', self.gf('django.db.models.fields.CharField')(unique=True, max_length=36, blank=True)),
            ('source', self.gf('django.db.models.fields.CharField')(max_length=1024)),
            ('sharename', self.gf('django.db.models.fields.CharField')(max_length=20, blank=True)),
            ('filetype', self.gf('django.db.models.fields.CharField')(max_length=15, blank=True)),
        ))
        db.send_create_signal('file_store', ['FileStoreItem'])


    def backwards(self, orm):
        # Deleting model 'FileStoreItem'
        db.delete_table('file_store_filestoreitem')


    models = {
        'file_store.filestoreitem': {
            'Meta': {'object_name': 'FileStoreItem'},
            'datafile': ('django.db.models.fields.files.FileField', [], {'max_length': '1024', 'blank': 'True'}),
            'filetype': ('django.db.models.fields.CharField', [], {'max_length': '15', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'sharename': ('django.db.models.fields.CharField', [], {'max_length': '20', 'blank': 'True'}),
            'source': ('django.db.models.fields.CharField', [], {'max_length': '1024'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        }
    }

    complete_apps = ['file_store']