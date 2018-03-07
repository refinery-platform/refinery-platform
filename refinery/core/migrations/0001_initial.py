# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django.utils.timezone
from django.conf import settings
import django_extensions.db.fields


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('galaxy_connector', '0001_initial'),
        ('data_set_manager', '0001_initial'),
        ('auth', '0001_initial'),
        ('file_store', '0001_initial'),
        ('registration', '0001_initial')
    ]

    operations = [
        migrations.CreateModel(
            name='Analysis',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.CharField(max_length=250, null=True)),
                ('summary', models.CharField(max_length=1000, blank=True)),
                ('creation_date', models.DateTimeField(auto_now_add=True)),
                ('modification_date', models.DateTimeField(auto_now=True)),
                ('description', models.TextField(max_length=5000, blank=True)),
                ('slug', models.CharField(max_length=250, null=True, blank=True)),
                ('workflow_steps_num', models.IntegerField(null=True, blank=True)),
                ('workflow_copy', models.TextField(null=True, blank=True)),
                ('history_id', models.TextField(null=True, blank=True)),
                ('workflow_galaxy_id', models.TextField(null=True, blank=True)),
                ('library_id', models.TextField(null=True, blank=True)),
                ('time_start', models.DateTimeField(null=True, blank=True)),
                ('time_end', models.DateTimeField(null=True, blank=True)),
                ('status', models.TextField(default=b'INITIALIZED', null=True, blank=True, choices=[(b'SUCCESS', b'Analysis finished successfully'), (b'FAILURE', b'Analysis terminated after errors'), (b'RUNNING', b'Analysis is running'), (b'INITIALIZED', b'Analysis was initialized')])),
                ('status_detail', models.TextField(null=True, blank=True)),
                ('canceled', models.BooleanField(default=False)),
            ],
            options={
                'ordering': ['-time_end', '-time_start'],
                'verbose_name': 'analysis',
                'verbose_name_plural': 'analyses',
                'permissions': (('read_analysis', 'Can read analysis'),),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='AnalysisNodeConnection',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('subanalysis', models.IntegerField(null=True)),
                ('step', models.IntegerField()),
                ('name', models.CharField(max_length=100)),
                ('filename', models.CharField(max_length=100)),
                ('filetype', models.CharField(max_length=100, null=True, blank=True)),
                ('direction', models.CharField(max_length=3, choices=[(b'in', b'in'), (b'out', b'out')])),
                ('is_refinery_file', models.BooleanField(default=False)),
                ('analysis', models.ForeignKey(related_name='workflow_node_connections', to='core.Analysis')),
                ('node', models.ForeignKey(related_name='workflow_node_connections', default=None, blank=True, to='data_set_manager.Node', null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='AnalysisResult',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('analysis_uuid', django_extensions.db.fields.UUIDField(max_length=36, editable=False, blank=True)),
                ('file_store_uuid', django_extensions.db.fields.UUIDField(max_length=36, editable=False, blank=True)),
                ('file_name', models.TextField()),
                ('file_type', models.TextField()),
            ],
            options={
                'verbose_name': 'analysis result',
                'verbose_name_plural': 'analysis results',
                'permissions': (('read_analysis result', 'Can read analysis result'),),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='CustomRegistrationProfile',
            fields=[
                ('registrationprofile_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='registration.RegistrationProfile')),
            ],
            options={
            },
            bases=('registration.registrationprofile',),
        ),
        migrations.CreateModel(
            name='DataSet',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.CharField(max_length=250, null=True)),
                ('summary', models.CharField(max_length=1000, blank=True)),
                ('creation_date', models.DateTimeField(auto_now_add=True)),
                ('modification_date', models.DateTimeField(auto_now=True)),
                ('description', models.TextField(max_length=5000, blank=True)),
                ('slug', models.CharField(max_length=250, null=True, blank=True)),
                ('file_count', models.IntegerField(default=0, null=True, blank=True)),
                ('file_size', models.BigIntegerField(default=0, null=True, blank=True)),
                ('accession', models.CharField(max_length=32, null=True, blank=True)),
                ('accession_source', models.CharField(max_length=128, null=True, blank=True)),
                ('title', models.CharField(default=b'Untitled data set', max_length=250)),
            ],
            options={
                'verbose_name': 'dataset',
                'permissions': (('read_dataset', 'Can read dataset'), ('share_dataset', 'Can share dataset')),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='DiskQuota',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.CharField(max_length=250, null=True)),
                ('summary', models.CharField(max_length=1000, blank=True)),
                ('creation_date', models.DateTimeField(auto_now_add=True)),
                ('modification_date', models.DateTimeField(auto_now=True)),
                ('description', models.TextField(max_length=5000, blank=True)),
                ('slug', models.CharField(max_length=250, null=True, blank=True)),
                ('maximum', models.IntegerField()),
                ('current', models.IntegerField()),
            ],
            options={
                'verbose_name': 'diskquota',
                'permissions': (('read_diskquota', 'Can read diskquota'), ('share_diskquota', 'Can share diskquota')),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Download',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.CharField(max_length=250, null=True)),
                ('summary', models.CharField(max_length=1000, blank=True)),
                ('creation_date', models.DateTimeField(auto_now_add=True)),
                ('modification_date', models.DateTimeField(auto_now=True)),
                ('description', models.TextField(max_length=5000, blank=True)),
                ('slug', models.CharField(max_length=250, null=True, blank=True)),
                ('analysis', models.ForeignKey(default=None, to='core.Analysis', null=True)),
                ('data_set', models.ForeignKey(to='core.DataSet')),
                ('file_store_item', models.ForeignKey(default=None, to='file_store.FileStoreItem', null=True)),
            ],
            options={
                'verbose_name': 'download',
                'permissions': (('read_download', 'Can read download'),),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='ExtendedGroup',
            fields=[
                ('group_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='auth.Group')),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('is_public', models.BooleanField(default=False)),
                ('manager_group', models.ForeignKey(related_name='managed_group', blank=True, to='core.ExtendedGroup', null=True)),
            ],
            options={
            },
            bases=('auth.group',),
        ),
        migrations.CreateModel(
            name='InvestigationLink',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('version', models.IntegerField(default=1)),
                ('message', models.CharField(max_length=500, null=True, blank=True)),
                ('date', models.DateTimeField(auto_now_add=True)),
                ('data_set', models.ForeignKey(to='core.DataSet')),
                ('investigation', models.ForeignKey(to='data_set_manager.Investigation')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Invitation',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('token_uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('group_id', models.IntegerField(null=True, blank=True)),
                ('created', models.DateTimeField(null=True, editable=False)),
                ('expires', models.DateTimeField(null=True, editable=False)),
                ('recipient_email', models.CharField(max_length=250, null=True)),
                ('sender', models.ForeignKey(to=settings.AUTH_USER_MODEL, null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='NodeGroup',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.CharField(max_length=250, null=True)),
                ('summary', models.CharField(max_length=1000, blank=True)),
                ('creation_date', models.DateTimeField(auto_now_add=True)),
                ('modification_date', models.DateTimeField(auto_now=True)),
                ('description', models.TextField(max_length=5000, blank=True)),
                ('slug', models.CharField(max_length=250, null=True, blank=True)),
                ('node_count', models.IntegerField(default=0)),
                ('is_implicit', models.BooleanField(default=False)),
                ('is_current', models.BooleanField(default=False)),
                ('assay', models.ForeignKey(to='data_set_manager.Assay')),
                ('nodes', models.ManyToManyField(to='data_set_manager.Node', null=True, blank=True)),
                ('study', models.ForeignKey(to='data_set_manager.Study')),
            ],
            options={
                'verbose_name': 'node group',
                'permissions': (('read_node group', 'Can read node group'), ('share_node group', 'Can share node group')),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='NodePair',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('group', models.IntegerField(null=True, blank=True)),
                ('node1', models.ForeignKey(related_name='node1', to='data_set_manager.Node')),
                ('node2', models.ForeignKey(related_name='node2', blank=True, to='data_set_manager.Node', null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='NodeRelationship',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.CharField(max_length=250, null=True)),
                ('summary', models.CharField(max_length=1000, blank=True)),
                ('creation_date', models.DateTimeField(auto_now_add=True)),
                ('modification_date', models.DateTimeField(auto_now=True)),
                ('description', models.TextField(max_length=5000, blank=True)),
                ('slug', models.CharField(max_length=250, null=True, blank=True)),
                ('type', models.CharField(blank=True, max_length=15, choices=[(b'1-1', b'1-1'), (b'1-N', b'1-N'), (b'N-1', b'N-1'), (b'replicate', b'replicate')])),
                ('is_current', models.BooleanField(default=False)),
                ('assay', models.ForeignKey(to='data_set_manager.Assay')),
                ('node_pairs', models.ManyToManyField(related_name='node_pairs', null=True, to='core.NodePair', blank=True)),
            ],
            options={
                'abstract': False,
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='NodeSet',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.CharField(max_length=250, null=True)),
                ('summary', models.CharField(max_length=1000, blank=True)),
                ('creation_date', models.DateTimeField(auto_now_add=True)),
                ('modification_date', models.DateTimeField(auto_now=True)),
                ('description', models.TextField(max_length=5000, blank=True)),
                ('slug', models.CharField(max_length=250, null=True, blank=True)),
                ('solr_query', models.TextField(null=True, blank=True)),
                ('solr_query_components', models.TextField(null=True, blank=True)),
                ('node_count', models.IntegerField(null=True, blank=True)),
                ('is_implicit', models.BooleanField(default=False)),
                ('is_current', models.BooleanField(default=False)),
                ('assay', models.ForeignKey(to='data_set_manager.Assay')),
                ('study', models.ForeignKey(to='data_set_manager.Study')),
            ],
            options={
                'verbose_name': 'nodeset',
                'permissions': (('read_nodeset', 'Can read nodeset'), ('share_nodeset', 'Can share nodeset')),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Ontology',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('import_date', models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ('name', models.CharField(max_length=64, blank=True)),
                ('acronym', models.CharField(unique=True, max_length=8, blank=True)),
                ('uri', models.CharField(unique=True, max_length=128, blank=True)),
                ('update_date', models.DateTimeField(auto_now=True)),
                ('version', models.CharField(max_length=256, null=True, blank=True)),
                ('owl2neo4j_version', models.CharField(max_length=16, null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.CharField(max_length=250, null=True)),
                ('summary', models.CharField(max_length=1000, blank=True)),
                ('creation_date', models.DateTimeField(auto_now_add=True)),
                ('modification_date', models.DateTimeField(auto_now=True)),
                ('description', models.TextField(max_length=5000, blank=True)),
                ('slug', models.CharField(max_length=250, null=True, blank=True)),
                ('is_catch_all', models.BooleanField(default=False)),
            ],
            options={
                'verbose_name': 'project',
                'permissions': (('read_project', 'Can read project'), ('share_project', 'Can share project')),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Tutorials',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('launchpad_tutorial_viewed', models.BooleanField(default=False)),
                ('collaboration_tutorial_viewed', models.BooleanField(default=False)),
                ('data_upload_tutorial_viewed', models.BooleanField(default=False)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('affiliation', models.CharField(max_length=100, blank=True)),
                ('login_count', models.IntegerField(default=0)),
                ('catch_all_project', models.ForeignKey(blank=True, to='core.Project', null=True)),
                ('user', models.OneToOneField(to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Workflow',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.CharField(max_length=250, null=True)),
                ('summary', models.CharField(max_length=1000, blank=True)),
                ('creation_date', models.DateTimeField(auto_now_add=True)),
                ('modification_date', models.DateTimeField(auto_now=True)),
                ('description', models.TextField(max_length=5000, blank=True)),
                ('slug', models.CharField(max_length=250, null=True, blank=True)),
                ('internal_id', models.CharField(max_length=50)),
                ('show_in_repository_mode', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=False)),
                ('type', models.CharField(default=b'analysis', max_length=25, choices=[(b'analysis', b'Workflow performs data analysis tasks. Results are merged into dataset.'), (b'download', b"Workflow creates bulk downloads. Results are add to user's download list.")])),
                ('graph', models.TextField(null=True, blank=True)),
            ],
            options={
                'verbose_name': 'workflow',
                'permissions': (('read_workflow', 'Can read workflow'), ('share_workflow', 'Can share workflow')),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='WorkflowDataInput',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(max_length=200)),
                ('internal_id', models.IntegerField()),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='WorkflowDataInputMap',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('workflow_data_input_name', models.CharField(max_length=200)),
                ('data_uuid', django_extensions.db.fields.UUIDField(max_length=36, editable=False, blank=True)),
                ('pair_id', models.IntegerField(null=True, blank=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='WorkflowEngine',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.CharField(max_length=250, null=True)),
                ('summary', models.CharField(max_length=1000, blank=True)),
                ('creation_date', models.DateTimeField(auto_now_add=True)),
                ('modification_date', models.DateTimeField(auto_now=True)),
                ('description', models.TextField(max_length=5000, blank=True)),
                ('slug', models.CharField(max_length=250, null=True, blank=True)),
                ('instance', models.ForeignKey(to='galaxy_connector.Instance', blank=True)),
            ],
            options={
                'verbose_name': 'workflowengine',
                'permissions': (('read_workflowengine', 'Can read workflowengine'),),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='WorkflowFilesDL',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('step_id', models.TextField()),
                ('pair_id', models.TextField()),
                ('filename', models.TextField()),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='WorkflowInputRelationships',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('category', models.CharField(blank=True, max_length=15, choices=[(b'1-1', b'1-1'), (b'1-N', b'1-N'), (b'N-1', b'N-1'), (b'replicate', b'replicate')])),
                ('set1', models.CharField(max_length=50)),
                ('set2', models.CharField(max_length=50, null=True, blank=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='workflow',
            name='data_inputs',
            field=models.ManyToManyField(to='core.WorkflowDataInput', blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='workflow',
            name='input_relationships',
            field=models.ManyToManyField(to='core.WorkflowInputRelationships', blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='workflow',
            name='workflow_engine',
            field=models.ForeignKey(to='core.WorkflowEngine'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='tutorials',
            name='user_profile',
            field=models.ForeignKey(to='core.UserProfile'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='noderelationship',
            name='node_set_1',
            field=models.ForeignKey(related_name='node_set_1', blank=True, to='core.NodeSet', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='noderelationship',
            name='node_set_2',
            field=models.ForeignKey(related_name='node_set_2', blank=True, to='core.NodeSet', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='noderelationship',
            name='study',
            field=models.ForeignKey(to='data_set_manager.Study'),
            preserve_default=True,
        ),
        migrations.AlterUniqueTogether(
            name='nodegroup',
            unique_together=set([('assay', 'name')]),
        ),
        migrations.AlterUniqueTogether(
            name='investigationlink',
            unique_together=set([('data_set', 'investigation', 'version')]),
        ),
        migrations.AddField(
            model_name='analysis',
            name='data_set',
            field=models.ForeignKey(to='core.DataSet', blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='analysis',
            name='project',
            field=models.ForeignKey(related_name='analyses', to='core.Project'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='analysis',
            name='results',
            field=models.ManyToManyField(to='core.AnalysisResult', blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='analysis',
            name='workflow',
            field=models.ForeignKey(to='core.Workflow', blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='analysis',
            name='workflow_data_input_maps',
            field=models.ManyToManyField(to='core.WorkflowDataInputMap', blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='analysis',
            name='workflow_dl_files',
            field=models.ManyToManyField(to='core.WorkflowFilesDL', blank=True),
            preserve_default=True,
        )
    ]
