# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding field 'FileStoreItem.import_task_id'
        db.add_column(u'file_store_filestoreitem', 'import_task_id',
                      self.gf('django.db.models.fields.CharField')(default='', max_length=36, blank=True),
                      keep_default=False)


    def backwards(self, orm):
        # Deleting field 'FileStoreItem.import_task_id'
        db.delete_column(u'file_store_filestoreitem', 'import_task_id')


    models = {
        u'file_store.filestoreitem': {
            'Meta': {'object_name': 'FileStoreItem'},
            'datafile': ('django.db.models.fields.files.FileField', [], {'max_length': '1024', 'blank': 'True'}),
            'filetype': ('django.db.models.fields.CharField', [], {'max_length': '15', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'import_task_id': ('django.db.models.fields.CharField', [], {'max_length': '36', 'blank': 'True'}),
            'sharename': ('django.db.models.fields.CharField', [], {'max_length': '20', 'blank': 'True'}),
            'source': ('django.db.models.fields.CharField', [], {'max_length': '1024'}),
            'uuid': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '36', 'blank': 'True'})
        }
    }

    complete_apps = ['file_store']