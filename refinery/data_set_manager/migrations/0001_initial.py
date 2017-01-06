# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django_extensions.db.fields


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='AnnotatedNode',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('node_uuid', django_extensions.db.fields.UUIDField(max_length=36, editable=False, blank=True)),
                ('node_file_uuid', django_extensions.db.fields.UUIDField(max_length=36, null=True, editable=False, blank=True)),
                ('node_type', models.TextField(db_index=True)),
                ('node_name', models.TextField(db_index=True)),
                ('attribute_type', models.TextField(db_index=True)),
                ('attribute_subtype', models.TextField(db_index=True, null=True, blank=True)),
                ('attribute_value', models.TextField(db_index=True, null=True, blank=True)),
                ('attribute_value_unit', models.TextField(null=True, blank=True)),
                ('node_species', models.IntegerField(null=True, db_index=True)),
                ('node_genome_build', models.TextField(null=True, db_index=True)),
                ('node_analysis_uuid', django_extensions.db.fields.UUIDField(default=None, max_length=36, null=True, editable=False, blank=True)),
                ('node_subanalysis', models.IntegerField(null=True)),
                ('node_workflow_output', models.CharField(max_length=100, null=True)),
                ('is_annotation', models.BooleanField(default=False)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='AnnotatedNodeRegistry',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('node_type', models.TextField(db_index=True)),
                ('creation_date', models.DateTimeField(auto_now_add=True)),
                ('modification_date', models.DateTimeField(auto_now=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Assay',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('measurement', models.TextField(null=True, blank=True)),
                ('measurement_accession', models.TextField(null=True, blank=True)),
                ('measurement_source', models.TextField(null=True, blank=True)),
                ('technology', models.TextField(null=True, blank=True)),
                ('technology_accession', models.TextField(null=True, blank=True)),
                ('technology_source', models.TextField(null=True, blank=True)),
                ('platform', models.TextField(null=True, blank=True)),
                ('file_name', models.TextField()),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Attribute',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('type', models.TextField(db_index=True)),
                ('subtype', models.TextField(db_index=True, null=True, blank=True)),
                ('value', models.TextField(db_index=True, null=True, blank=True)),
                ('value_unit', models.TextField(null=True, blank=True)),
                ('value_accession', models.TextField(null=True, blank=True)),
                ('value_source', models.TextField(null=True, blank=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='AttributeDefinition',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('type', models.TextField(db_index=True)),
                ('subtype', models.TextField(db_index=True, null=True, blank=True)),
                ('value', models.TextField(db_index=True, null=True, blank=True)),
                ('definition', models.TextField(db_index=True, null=True, blank=True)),
                ('value_accession', models.TextField(null=True, blank=True)),
                ('value_source', models.TextField(null=True, blank=True)),
                ('assay', models.ForeignKey(blank=True, to='data_set_manager.Assay', null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='AttributeOrder',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('solr_field', models.TextField(db_index=True)),
                ('rank', models.IntegerField(null=True, blank=True)),
                ('is_exposed', models.BooleanField(default=True)),
                ('is_facet', models.BooleanField(default=True)),
                ('is_active', models.BooleanField(default=True)),
                ('is_internal', models.BooleanField(default=False)),
                ('assay', models.ForeignKey(blank=True, to='data_set_manager.Assay', null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Contact',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('last_name', models.TextField(null=True, blank=True)),
                ('first_name', models.TextField(null=True, blank=True)),
                ('middle_initials', models.TextField(null=True, blank=True)),
                ('email', models.EmailField(max_length=75, null=True, blank=True)),
                ('phone', models.TextField(null=True, blank=True)),
                ('fax', models.TextField(null=True, blank=True)),
                ('address', models.TextField(null=True, blank=True)),
                ('affiliation', models.TextField(null=True, blank=True)),
                ('roles', models.TextField(null=True, blank=True)),
                ('roles_accession', models.TextField(null=True, blank=True)),
                ('roles_source', models.TextField(null=True, blank=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Design',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('type', models.TextField(null=True, blank=True)),
                ('type_accession', models.TextField(null=True, blank=True)),
                ('type_source', models.TextField(null=True, blank=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Factor',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.TextField(null=True, blank=True)),
                ('type', models.TextField(null=True, blank=True)),
                ('type_accession', models.TextField(null=True, blank=True)),
                ('type_source', models.TextField(null=True, blank=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Node',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('type', models.TextField(db_index=True)),
                ('name', models.TextField(db_index=True)),
                ('file_uuid', django_extensions.db.fields.UUIDField(default=None, max_length=36, null=True, editable=False, blank=True)),
                ('genome_build', models.TextField(null=True, db_index=True)),
                ('species', models.IntegerField(null=True, db_index=True)),
                ('is_annotation', models.BooleanField(default=False)),
                ('analysis_uuid', django_extensions.db.fields.UUIDField(default=None, max_length=36, null=True, editable=False, blank=True)),
                ('is_auxiliary_node', models.BooleanField(default=False)),
                ('subanalysis', models.IntegerField(null=True)),
                ('workflow_output', models.CharField(max_length=100, null=True)),
                ('assay', models.ForeignKey(blank=True, to='data_set_manager.Assay', null=True)),
                ('children', models.ManyToManyField(related_name='parents_set', to='data_set_manager.Node')),
                ('parents', models.ManyToManyField(related_name='children_set', to='data_set_manager.Node')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='NodeCollection',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('identifier', models.TextField(null=True, blank=True)),
                ('title', models.TextField(null=True, blank=True)),
                ('description', models.TextField(null=True, blank=True)),
                ('submission_date', models.DateField(null=True, blank=True)),
                ('release_date', models.DateField(null=True, blank=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Investigation',
            fields=[
                ('nodecollection_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='data_set_manager.NodeCollection')),
                ('isarchive_file', django_extensions.db.fields.UUIDField(max_length=36, null=True, editable=False, blank=True)),
                ('pre_isarchive_file', django_extensions.db.fields.UUIDField(max_length=36, null=True, editable=False, blank=True)),
            ],
            options={
            },
            bases=('data_set_manager.nodecollection',),
        ),
        migrations.CreateModel(
            name='Ontology',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.TextField(null=True, blank=True)),
                ('file_name', models.TextField(null=True, blank=True)),
                ('version', models.TextField(null=True, blank=True)),
                ('description', models.TextField(null=True, blank=True)),
                ('investigation', models.ForeignKey(to='data_set_manager.Investigation')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Protocol',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('workflow_uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('version', models.TextField(null=True, blank=True)),
                ('name', models.TextField(null=True, blank=True)),
                ('name_accession', models.TextField(null=True, blank=True)),
                ('name_source', models.TextField(null=True, blank=True)),
                ('type', models.TextField(null=True, blank=True)),
                ('type_accession', models.TextField(null=True, blank=True)),
                ('type_source', models.TextField(null=True, blank=True)),
                ('description', models.TextField(null=True, blank=True)),
                ('uri', models.TextField(null=True, blank=True)),
            ],
            options={
                'ordering': ['id'],
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='ProtocolComponent',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.TextField(null=True, blank=True)),
                ('type', models.TextField(null=True, blank=True)),
                ('type_accession', models.TextField(null=True, blank=True)),
                ('type_source', models.TextField(null=True, blank=True)),
                ('protocol', models.ForeignKey(to='data_set_manager.Protocol')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='ProtocolParameter',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.TextField(null=True, blank=True)),
                ('name_accession', models.TextField(null=True, blank=True)),
                ('name_source', models.TextField(null=True, blank=True)),
                ('protocol', models.ForeignKey(to='data_set_manager.Protocol')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='ProtocolReference',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('performer', models.TextField(null=True, blank=True)),
                ('performer_uuid', django_extensions.db.fields.UUIDField(max_length=36, null=True, editable=False, blank=True)),
                ('date', models.DateField(null=True, blank=True)),
                ('comment', models.TextField(null=True, blank=True)),
                ('node', models.ForeignKey(to='data_set_manager.Node')),
                ('protocol', models.ForeignKey(to='data_set_manager.Protocol')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='ProtocolReferenceParameter',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.TextField(null=True, blank=True)),
                ('value', models.TextField(null=True, blank=True)),
                ('value_unit', models.TextField(null=True, blank=True)),
                ('value_accession', models.TextField(null=True, blank=True)),
                ('value_source', models.TextField(null=True, blank=True)),
                ('protocol_reference', models.ForeignKey(to='data_set_manager.ProtocolReference')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Publication',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('title', models.TextField(null=True, blank=True)),
                ('authors', models.TextField(null=True, blank=True)),
                ('pubmed_id', models.TextField(null=True, blank=True)),
                ('doi', models.TextField(null=True, blank=True)),
                ('status', models.TextField(null=True, blank=True)),
                ('status_accession', models.TextField(null=True, blank=True)),
                ('status_source', models.TextField(null=True, blank=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Study',
            fields=[
                ('nodecollection_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='data_set_manager.NodeCollection')),
                ('file_name', models.TextField()),
                ('investigation', models.ForeignKey(to='data_set_manager.Investigation')),
            ],
            options={
            },
            bases=('data_set_manager.nodecollection',),
        ),
        migrations.AddField(
            model_name='publication',
            name='collection',
            field=models.ForeignKey(to='data_set_manager.NodeCollection'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='protocolparameter',
            name='study',
            field=models.ForeignKey(to='data_set_manager.Study'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='protocolcomponent',
            name='study',
            field=models.ForeignKey(to='data_set_manager.Study'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='protocol',
            name='study',
            field=models.ForeignKey(to='data_set_manager.Study'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='node',
            name='study',
            field=models.ForeignKey(to='data_set_manager.Study'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='factor',
            name='study',
            field=models.ForeignKey(to='data_set_manager.Study'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='design',
            name='study',
            field=models.ForeignKey(to='data_set_manager.Study'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='contact',
            name='collection',
            field=models.ForeignKey(to='data_set_manager.NodeCollection'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='attributeorder',
            name='study',
            field=models.ForeignKey(to='data_set_manager.Study'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='attributedefinition',
            name='study',
            field=models.ForeignKey(to='data_set_manager.Study'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='attribute',
            name='node',
            field=models.ForeignKey(to='data_set_manager.Node'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='assay',
            name='study',
            field=models.ForeignKey(to='data_set_manager.Study'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='annotatednoderegistry',
            name='assay',
            field=models.ForeignKey(blank=True, to='data_set_manager.Assay', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='annotatednoderegistry',
            name='study',
            field=models.ForeignKey(to='data_set_manager.Study'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='annotatednode',
            name='assay',
            field=models.ForeignKey(blank=True, to='data_set_manager.Assay', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='annotatednode',
            name='attribute',
            field=models.ForeignKey(to='data_set_manager.Attribute'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='annotatednode',
            name='node',
            field=models.ForeignKey(to='data_set_manager.Node'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='annotatednode',
            name='study',
            field=models.ForeignKey(to='data_set_manager.Study'),
            preserve_default=True,
        ),
    ]
