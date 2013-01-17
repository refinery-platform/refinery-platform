# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model '_FileServerItem'
        db.create_table('file_server__fileserveritem', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('data_file', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['file_store.FileStoreItem'], unique=True)),
        ))
        db.send_create_signal('file_server', ['_FileServerItem'])

        # Adding model 'TDFItem'
        db.create_table('file_server_tdfitem', (
            ('_fileserveritem_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['file_server._FileServerItem'], unique=True, primary_key=True)),
        ))
        db.send_create_signal('file_server', ['TDFItem'])

        # Adding model 'BigBEDItem'
        db.create_table('file_server_bigbeditem', (
            ('_fileserveritem_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['file_server._FileServerItem'], unique=True, primary_key=True)),
        ))
        db.send_create_signal('file_server', ['BigBEDItem'])

        # Adding model 'BAMItem'
        db.create_table('file_server_bamitem', (
            ('_fileserveritem_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['file_server._FileServerItem'], unique=True, primary_key=True)),
            ('index_file', self.gf('django.db.models.fields.related.ForeignKey')(blank=True, related_name='bamitem_index_file', null=True, to=orm['file_store.FileStoreItem'])),
            ('tdf_file', self.gf('django.db.models.fields.related.ForeignKey')(blank=True, related_name='bamitem_tdf_file', null=True, to=orm['file_store.FileStoreItem'])),
        ))
        db.send_create_signal('file_server', ['BAMItem'])

        # Adding model 'WIGItem'
        db.create_table('file_server_wigitem', (
            ('_fileserveritem_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['file_server._FileServerItem'], unique=True, primary_key=True)),
            ('tdf_file', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['file_store.FileStoreItem'], null=True, blank=True)),
        ))
        db.send_create_signal('file_server', ['WIGItem'])


    def backwards(self, orm):
        # Deleting model '_FileServerItem'
        db.delete_table('file_server__fileserveritem')

        # Deleting model 'TDFItem'
        db.delete_table('file_server_tdfitem')

        # Deleting model 'BigBEDItem'
        db.delete_table('file_server_bigbeditem')

        # Deleting model 'BAMItem'
        db.delete_table('file_server_bamitem')

        # Deleting model 'WIGItem'
        db.delete_table('file_server_wigitem')


    models = {
        'file_server._fileserveritem': {
            'Meta': {'object_name': '_FileServerItem'},
            'data_file': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['file_store.FileStoreItem']", 'unique': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'})
        },
        'file_server.bamitem': {
            'Meta': {'object_name': 'BAMItem', '_ormbases': ['file_server._FileServerItem']},
            '_fileserveritem_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': "orm['file_server._FileServerItem']", 'unique': 'True', 'primary_key': 'True'}),
            'index_file': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'bamitem_index_file'", 'null': 'True', 'to': "orm['file_store.FileStoreItem']"}),
            'tdf_file': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'bamitem_tdf_file'", 'null': 'True', 'to': "orm['file_store.FileStoreItem']"})
        },
        'file_server.bigbeditem': {
            'Meta': {'object_name': 'BigBEDItem', '_ormbases': ['file_server._FileServerItem']},
            '_fileserveritem_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': "orm['file_server._FileServerItem']", 'unique': 'True', 'primary_key': 'True'})
        },
        'file_server.tdfitem': {
            'Meta': {'object_name': 'TDFItem', '_ormbases': ['file_server._FileServerItem']},
            '_fileserveritem_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': "orm['file_server._FileServerItem']", 'unique': 'True', 'primary_key': 'True'})
        },
        'file_server.wigitem': {
            'Meta': {'object_name': 'WIGItem', '_ormbases': ['file_server._FileServerItem']},
            '_fileserveritem_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': "orm['file_server._FileServerItem']", 'unique': 'True', 'primary_key': 'True'}),
            'tdf_file': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['file_store.FileStoreItem']", 'null': 'True', 'blank': 'True'})
        },
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

    complete_apps = ['file_server']