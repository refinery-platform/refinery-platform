# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding field 'FileStoreItem.created'
        db.add_column(u'file_store_filestoreitem', 'created',
                      self.gf('django.db.models.fields.DateTimeField')(default=datetime.datetime.now, auto_now_add=True, blank=True),
                      keep_default=False)

        # Adding field 'FileStoreItem.updated'
        db.add_column(u'file_store_filestoreitem', 'updated',
                      self.gf('django.db.models.fields.DateTimeField')(default=datetime.datetime.now, auto_now=True, blank=True),
                      keep_default=False)


    def backwards(self, orm):
        # Deleting field 'FileStoreItem.created'
        db.delete_column(u'file_store_filestoreitem', 'created')

        # Deleting field 'FileStoreItem.updated'
        db.delete_column(u'file_store_filestoreitem', 'updated')


    models = {
        u'file_store.filestoreitem': {
            'Meta': {'object_name': 'FileStoreItem'},
            'created': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now', 'auto_now_add': 'True', 'blank': 'True'}),
            'datafile': ('django.db.models.fields.files.FileField', [], {'max_length': '1024', 'blank': 'True'}),
            'filetype': ('django.db.models.fields.related.ForeignKey', [], {'default': '33', 'to': u"orm['file_store.FileType']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'import_task_id': ('django.db.models.fields.CharField', [], {'max_length': '36', 'blank': 'True'}),
            'sharename': ('django.db.models.fields.CharField', [], {'max_length': '20', 'blank': 'True'}),
            'source': ('django.db.models.fields.CharField', [], {'max_length': '1024'}),
            'updated': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now', 'auto_now': 'True', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'file_store.filetype': {
            'Meta': {'object_name': 'FileType'},
            'description': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            'extension': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '50'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '50'})
        }
    }

    complete_apps = ['file_store']