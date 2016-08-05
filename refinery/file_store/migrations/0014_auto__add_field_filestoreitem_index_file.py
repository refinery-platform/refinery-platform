# -*- coding: utf-8 -*-
from south.utils import datetime_utils as datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding field 'FileStoreItem.index_file'
        db.add_column(u'file_store_filestoreitem', 'index_file',
                      self.gf('django.db.models.fields.related.OneToOneField')(to=orm['file_store.FileStoreItem'], unique=True, null=True, blank=True),
                      keep_default=False)


    def backwards(self, orm):
        # Deleting field 'FileStoreItem.index_file'
        db.delete_column(u'file_store_filestoreitem', 'index_file_id')


    models = {
        u'file_store.fileextension': {
            'Meta': {'object_name': 'FileExtension'},
            'filetype': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['file_store.FileType']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '50'})
        },
        u'file_store.filestoreitem': {
            'Meta': {'object_name': 'FileStoreItem'},
            'created': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now', 'auto_now_add': 'True', 'blank': 'True'}),
            'datafile': ('django.db.models.fields.files.FileField', [], {'max_length': '1024', 'blank': 'True'}),
            'filetype': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['file_store.FileType']", 'null': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'import_task_id': ('django.db.models.fields.CharField', [], {'max_length': '36', 'blank': 'True'}),
            'index_file': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['file_store.FileStoreItem']", 'unique': 'True', 'null': 'True', 'blank': 'True'}),
            'sharename': ('django.db.models.fields.CharField', [], {'max_length': '20', 'blank': 'True'}),
            'source': ('django.db.models.fields.CharField', [], {'max_length': '1024'}),
            'updated': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now', 'auto_now': 'True', 'blank': 'True'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        },
        u'file_store.filetype': {
            'Meta': {'object_name': 'FileType'},
            'description': ('django.db.models.fields.CharField', [], {'max_length': '250'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '50'})
        }
    }

    complete_apps = ['file_store']