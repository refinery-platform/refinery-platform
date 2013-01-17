# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'WigDescription'
        db.create_table('annotation_server_wigdescription', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('genome_build', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('annotation_type', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=1024)),
            ('altColor', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('color', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('visibility', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('priority', self.gf('django.db.models.fields.IntegerField')()),
            ('type', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('description', self.gf('django.db.models.fields.TextField')()),
        ))
        db.send_create_signal('annotation_server', ['WigDescription'])

        # Adding model 'Taxon'
        db.create_table('annotation_server_taxon', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('taxon_id', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=1024)),
            ('unique_name', self.gf('django.db.models.fields.CharField')(max_length=1024, null=True, blank=True)),
            ('type', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
        ))
        db.send_create_signal('annotation_server', ['Taxon'])

        # Adding unique constraint on 'Taxon', fields ['taxon_id', 'name']
        db.create_unique('annotation_server_taxon', ['taxon_id', 'name'])

        # Adding model 'GenomeBuild'
        db.create_table('annotation_server_genomebuild', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('name', self.gf('django.db.models.fields.CharField')(unique=True, max_length=255)),
            ('affiliation', self.gf('django.db.models.fields.CharField')(default='UCSC', max_length=255)),
            ('description', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('species', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.Taxon'])),
            ('html_path', self.gf('django.db.models.fields.CharField')(max_length=1024, null=True, blank=True)),
            ('source_name', self.gf('django.db.models.fields.CharField')(max_length=1024, null=True, blank=True)),
            ('available', self.gf('django.db.models.fields.BooleanField')(default=True)),
            ('default_build', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('ucsc_equivalent', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.GenomeBuild'], null=True, blank=True)),
        ))
        db.send_create_signal('annotation_server', ['GenomeBuild'])

        # Adding model 'hg19_Sequence'
        db.create_table('annotation_server_hg19_sequence', (
            ('seq_id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('name', self.gf('django.db.models.fields.CharField')(unique=True, max_length=255, db_index=True)),
            ('seq', self.gf('django.db.models.fields.TextField')()),
            ('strand', self.gf('django.db.models.fields.CharField')(default='+', max_length=1)),
        ))
        db.send_create_signal('annotation_server', ['hg19_Sequence'])

        # Adding model 'hg19_CytoBand'
        db.create_table('annotation_server_hg19_cytoband', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('gieStain', self.gf('django.db.models.fields.CharField')(max_length=255)),
        ))
        db.send_create_signal('annotation_server', ['hg19_CytoBand'])

        # Adding model 'hg19_ChromInfo'
        db.create_table('annotation_server_hg19_chrominfo', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('size', self.gf('django.db.models.fields.IntegerField')()),
            ('fileName', self.gf('django.db.models.fields.CharField')(max_length=255)),
        ))
        db.send_create_signal('annotation_server', ['hg19_ChromInfo'])

        # Adding model 'hg19_EnsGene'
        db.create_table('annotation_server_hg19_ensgene', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('bin', self.gf('django.db.models.fields.IntegerField')()),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('txStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('txEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('cdsStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('cdsEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('exonCount', self.gf('django.db.models.fields.IntegerField')()),
            ('exonStarts', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700, db_index=True)),
            ('exonEnds', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700, db_index=True)),
            ('score', self.gf('django.db.models.fields.IntegerField')()),
            ('name2', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('cdsStartStat', self.gf('django.db.models.fields.CharField')(max_length=10, db_index=True)),
            ('cdsEndStat', self.gf('django.db.models.fields.CharField')(max_length=10, db_index=True)),
            ('exonFrames', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
        ))
        db.send_create_signal('annotation_server', ['hg19_EnsGene'])

        # Adding model 'hg19_GapRegions'
        db.create_table('annotation_server_hg19_gapregions', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('bin', self.gf('django.db.models.fields.IntegerField')()),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('ix', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('n', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('size', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('type', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('bridge', self.gf('django.db.models.fields.CharField')(max_length=255)),
        ))
        db.send_create_signal('annotation_server', ['hg19_GapRegions'])

        # Adding model 'hg19_MappabilityEmpirial'
        db.create_table('annotation_server_hg19_mappabilityempirial', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('score', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('thickStart', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('thickEnd', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('itemRgb', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('blockCount', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('blockSizes', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
            ('blockStarts', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
        ))
        db.send_create_signal('annotation_server', ['hg19_MappabilityEmpirial'])

        # Adding model 'hg19_MappabilityTheoretical'
        db.create_table('annotation_server_hg19_mappabilitytheoretical', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('score', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('thickStart', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('thickEnd', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('itemRgb', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('blockCount', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('blockSizes', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
            ('blockStarts', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
        ))
        db.send_create_signal('annotation_server', ['hg19_MappabilityTheoretical'])

        # Adding model 'hg19_GenCode'
        db.create_table('annotation_server_hg19_gencode', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('source', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('feature', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('start', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('end', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('score', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('frame', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('attribute', self.gf('django.db.models.fields.TextField')()),
            ('gene_id', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('transcript_id', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('gene_type', self.gf('django.db.models.fields.CharField')(max_length=100, db_index=True)),
            ('gene_status', self.gf('django.db.models.fields.CharField')(max_length=100, db_index=True)),
            ('gene_name', self.gf('django.db.models.fields.CharField')(max_length=100, db_index=True)),
            ('transcript_type', self.gf('django.db.models.fields.CharField')(max_length=100, db_index=True)),
            ('transcript_status', self.gf('django.db.models.fields.CharField')(max_length=100, db_index=True)),
            ('transcript_name', self.gf('django.db.models.fields.CharField')(max_length=100, db_index=True)),
        ))
        db.send_create_signal('annotation_server', ['hg19_GenCode'])

        # Adding model 'hg19_GC'
        db.create_table('annotation_server_hg19_gc', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('position', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('value', self.gf('django.db.models.fields.FloatField')()),
            ('annot', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.WigDescription'])),
        ))
        db.send_create_signal('annotation_server', ['hg19_GC'])

        # Adding model 'hg19_Conservation'
        db.create_table('annotation_server_hg19_conservation', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('position', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('value', self.gf('django.db.models.fields.FloatField')()),
            ('annot', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.WigDescription'])),
        ))
        db.send_create_signal('annotation_server', ['hg19_Conservation'])

        # Adding model 'ce10_Sequence'
        db.create_table('annotation_server_ce10_sequence', (
            ('seq_id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('name', self.gf('django.db.models.fields.CharField')(unique=True, max_length=255, db_index=True)),
            ('seq', self.gf('django.db.models.fields.TextField')()),
            ('strand', self.gf('django.db.models.fields.CharField')(default='+', max_length=1)),
        ))
        db.send_create_signal('annotation_server', ['ce10_Sequence'])

        # Adding model 'ce10_CytoBand'
        db.create_table('annotation_server_ce10_cytoband', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('gieStain', self.gf('django.db.models.fields.CharField')(max_length=255)),
        ))
        db.send_create_signal('annotation_server', ['ce10_CytoBand'])

        # Adding model 'ce10_ChromInfo'
        db.create_table('annotation_server_ce10_chrominfo', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('size', self.gf('django.db.models.fields.IntegerField')()),
            ('fileName', self.gf('django.db.models.fields.CharField')(max_length=255)),
        ))
        db.send_create_signal('annotation_server', ['ce10_ChromInfo'])

        # Adding model 'ce10_EnsGene'
        db.create_table('annotation_server_ce10_ensgene', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('bin', self.gf('django.db.models.fields.IntegerField')()),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('txStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('txEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('cdsStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('cdsEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('exonCount', self.gf('django.db.models.fields.IntegerField')()),
            ('exonStarts', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700, db_index=True)),
            ('exonEnds', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700, db_index=True)),
            ('score', self.gf('django.db.models.fields.IntegerField')()),
            ('name2', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('cdsStartStat', self.gf('django.db.models.fields.CharField')(max_length=10, db_index=True)),
            ('cdsEndStat', self.gf('django.db.models.fields.CharField')(max_length=10, db_index=True)),
            ('exonFrames', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
        ))
        db.send_create_signal('annotation_server', ['ce10_EnsGene'])

        # Adding model 'ce10_MappabilityEmpirial'
        db.create_table('annotation_server_ce10_mappabilityempirial', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('score', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('thickStart', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('thickEnd', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('itemRgb', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('blockCount', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('blockSizes', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
            ('blockStarts', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
        ))
        db.send_create_signal('annotation_server', ['ce10_MappabilityEmpirial'])

        # Adding model 'ce10_WormBase'
        db.create_table('annotation_server_ce10_wormbase', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('source', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('feature', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('start', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('end', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('score', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('frame', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('attribute', self.gf('django.db.models.fields.TextField')()),
            ('cds', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('clone', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('gene', self.gf('django.db.models.fields.CharField')(max_length=100)),
        ))
        db.send_create_signal('annotation_server', ['ce10_WormBase'])

        # Adding model 'ce10_GC'
        db.create_table('annotation_server_ce10_gc', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('position', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('value', self.gf('django.db.models.fields.FloatField')()),
            ('annot', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.WigDescription'])),
        ))
        db.send_create_signal('annotation_server', ['ce10_GC'])

        # Adding model 'ce10_Conservation'
        db.create_table('annotation_server_ce10_conservation', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('position', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('value', self.gf('django.db.models.fields.FloatField')()),
            ('annot', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.WigDescription'])),
        ))
        db.send_create_signal('annotation_server', ['ce10_Conservation'])

        # Adding model 'dm3_Sequence'
        db.create_table('annotation_server_dm3_sequence', (
            ('seq_id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('name', self.gf('django.db.models.fields.CharField')(unique=True, max_length=255, db_index=True)),
            ('seq', self.gf('django.db.models.fields.TextField')()),
            ('strand', self.gf('django.db.models.fields.CharField')(default='+', max_length=1)),
        ))
        db.send_create_signal('annotation_server', ['dm3_Sequence'])

        # Adding model 'dm3_CytoBand'
        db.create_table('annotation_server_dm3_cytoband', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('gieStain', self.gf('django.db.models.fields.CharField')(max_length=255)),
        ))
        db.send_create_signal('annotation_server', ['dm3_CytoBand'])

        # Adding model 'dm3_ChromInfo'
        db.create_table('annotation_server_dm3_chrominfo', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('size', self.gf('django.db.models.fields.IntegerField')()),
            ('fileName', self.gf('django.db.models.fields.CharField')(max_length=255)),
        ))
        db.send_create_signal('annotation_server', ['dm3_ChromInfo'])

        # Adding model 'dm3_EnsGene'
        db.create_table('annotation_server_dm3_ensgene', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('bin', self.gf('django.db.models.fields.IntegerField')()),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('txStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('txEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('cdsStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('cdsEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('exonCount', self.gf('django.db.models.fields.IntegerField')()),
            ('exonStarts', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700, db_index=True)),
            ('exonEnds', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700, db_index=True)),
            ('score', self.gf('django.db.models.fields.IntegerField')()),
            ('name2', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('cdsStartStat', self.gf('django.db.models.fields.CharField')(max_length=10, db_index=True)),
            ('cdsEndStat', self.gf('django.db.models.fields.CharField')(max_length=10, db_index=True)),
            ('exonFrames', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
        ))
        db.send_create_signal('annotation_server', ['dm3_EnsGene'])

        # Adding model 'dm3_GapRegions'
        db.create_table('annotation_server_dm3_gapregions', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('bin', self.gf('django.db.models.fields.IntegerField')()),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('ix', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('n', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('size', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('type', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('bridge', self.gf('django.db.models.fields.CharField')(max_length=255)),
        ))
        db.send_create_signal('annotation_server', ['dm3_GapRegions'])

        # Adding model 'dm3_MappabilityEmpirial'
        db.create_table('annotation_server_dm3_mappabilityempirial', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('score', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('thickStart', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('thickEnd', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('itemRgb', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('blockCount', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('blockSizes', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
            ('blockStarts', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
        ))
        db.send_create_signal('annotation_server', ['dm3_MappabilityEmpirial'])

        # Adding model 'dm3_FlyBase'
        db.create_table('annotation_server_dm3_flybase', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('source', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('feature', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('start', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('end', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('score', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('frame', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('attribute', self.gf('django.db.models.fields.TextField')()),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('Alias', self.gf('django.db.models.fields.TextField')()),
            ('description', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('fullname', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('symbol', self.gf('django.db.models.fields.CharField')(max_length=100)),
        ))
        db.send_create_signal('annotation_server', ['dm3_FlyBase'])

        # Adding model 'dm3_GC'
        db.create_table('annotation_server_dm3_gc', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('position', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('value', self.gf('django.db.models.fields.FloatField')()),
            ('annot', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.WigDescription'])),
        ))
        db.send_create_signal('annotation_server', ['dm3_GC'])

        # Adding model 'dm3_Conservation'
        db.create_table('annotation_server_dm3_conservation', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('position', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('value', self.gf('django.db.models.fields.FloatField')()),
            ('annot', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.WigDescription'])),
        ))
        db.send_create_signal('annotation_server', ['dm3_Conservation'])


    def backwards(self, orm):
        # Removing unique constraint on 'Taxon', fields ['taxon_id', 'name']
        db.delete_unique('annotation_server_taxon', ['taxon_id', 'name'])

        # Deleting model 'WigDescription'
        db.delete_table('annotation_server_wigdescription')

        # Deleting model 'Taxon'
        db.delete_table('annotation_server_taxon')

        # Deleting model 'GenomeBuild'
        db.delete_table('annotation_server_genomebuild')

        # Deleting model 'hg19_Sequence'
        db.delete_table('annotation_server_hg19_sequence')

        # Deleting model 'hg19_CytoBand'
        db.delete_table('annotation_server_hg19_cytoband')

        # Deleting model 'hg19_ChromInfo'
        db.delete_table('annotation_server_hg19_chrominfo')

        # Deleting model 'hg19_EnsGene'
        db.delete_table('annotation_server_hg19_ensgene')

        # Deleting model 'hg19_GapRegions'
        db.delete_table('annotation_server_hg19_gapregions')

        # Deleting model 'hg19_MappabilityEmpirial'
        db.delete_table('annotation_server_hg19_mappabilityempirial')

        # Deleting model 'hg19_MappabilityTheoretical'
        db.delete_table('annotation_server_hg19_mappabilitytheoretical')

        # Deleting model 'hg19_GenCode'
        db.delete_table('annotation_server_hg19_gencode')

        # Deleting model 'hg19_GC'
        db.delete_table('annotation_server_hg19_gc')

        # Deleting model 'hg19_Conservation'
        db.delete_table('annotation_server_hg19_conservation')

        # Deleting model 'ce10_Sequence'
        db.delete_table('annotation_server_ce10_sequence')

        # Deleting model 'ce10_CytoBand'
        db.delete_table('annotation_server_ce10_cytoband')

        # Deleting model 'ce10_ChromInfo'
        db.delete_table('annotation_server_ce10_chrominfo')

        # Deleting model 'ce10_EnsGene'
        db.delete_table('annotation_server_ce10_ensgene')

        # Deleting model 'ce10_MappabilityEmpirial'
        db.delete_table('annotation_server_ce10_mappabilityempirial')

        # Deleting model 'ce10_WormBase'
        db.delete_table('annotation_server_ce10_wormbase')

        # Deleting model 'ce10_GC'
        db.delete_table('annotation_server_ce10_gc')

        # Deleting model 'ce10_Conservation'
        db.delete_table('annotation_server_ce10_conservation')

        # Deleting model 'dm3_Sequence'
        db.delete_table('annotation_server_dm3_sequence')

        # Deleting model 'dm3_CytoBand'
        db.delete_table('annotation_server_dm3_cytoband')

        # Deleting model 'dm3_ChromInfo'
        db.delete_table('annotation_server_dm3_chrominfo')

        # Deleting model 'dm3_EnsGene'
        db.delete_table('annotation_server_dm3_ensgene')

        # Deleting model 'dm3_GapRegions'
        db.delete_table('annotation_server_dm3_gapregions')

        # Deleting model 'dm3_MappabilityEmpirial'
        db.delete_table('annotation_server_dm3_mappabilityempirial')

        # Deleting model 'dm3_FlyBase'
        db.delete_table('annotation_server_dm3_flybase')

        # Deleting model 'dm3_GC'
        db.delete_table('annotation_server_dm3_gc')

        # Deleting model 'dm3_Conservation'
        db.delete_table('annotation_server_dm3_conservation')


    models = {
        'annotation_server.ce10_chrominfo': {
            'Meta': {'ordering': "['-size']", 'object_name': 'ce10_ChromInfo'},
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'fileName': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'size': ('django.db.models.fields.IntegerField', [], {})
        },
        'annotation_server.ce10_conservation': {
            'Meta': {'ordering': "['chrom', 'position']", 'object_name': 'ce10_Conservation'},
            'annot': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['annotation_server.WigDescription']"}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'position': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'value': ('django.db.models.fields.FloatField', [], {})
        },
        'annotation_server.ce10_cytoband': {
            'Meta': {'ordering': "['chrom', 'chromStart']", 'object_name': 'ce10_CytoBand'},
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'chromEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'chromStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'gieStain': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'})
        },
        'annotation_server.ce10_ensgene': {
            'Meta': {'ordering': "['chrom', 'txStart']", 'object_name': 'ce10_EnsGene'},
            'bin': ('django.db.models.fields.IntegerField', [], {}),
            'cdsEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'cdsEndStat': ('django.db.models.fields.CharField', [], {'max_length': '10', 'db_index': 'True'}),
            'cdsStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'cdsStartStat': ('django.db.models.fields.CharField', [], {'max_length': '10', 'db_index': 'True'}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'exonCount': ('django.db.models.fields.IntegerField', [], {}),
            'exonEnds': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700', 'db_index': 'True'}),
            'exonFrames': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700'}),
            'exonStarts': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700', 'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'name2': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'score': ('django.db.models.fields.IntegerField', [], {}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'txEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'txStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'})
        },
        'annotation_server.ce10_gc': {
            'Meta': {'ordering': "['chrom', 'position']", 'object_name': 'ce10_GC'},
            'annot': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['annotation_server.WigDescription']"}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'position': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'value': ('django.db.models.fields.FloatField', [], {})
        },
        'annotation_server.ce10_mappabilityempirial': {
            'Meta': {'ordering': "['chrom', 'chromStart']", 'object_name': 'ce10_MappabilityEmpirial'},
            'blockCount': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'blockSizes': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700'}),
            'blockStarts': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700'}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'chromEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'chromStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'itemRgb': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'score': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'thickEnd': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'thickStart': ('django.db.models.fields.IntegerField', [], {'null': 'True'})
        },
        'annotation_server.ce10_sequence': {
            'Meta': {'object_name': 'ce10_Sequence'},
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '255', 'db_index': 'True'}),
            'seq': ('django.db.models.fields.TextField', [], {}),
            'seq_id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'strand': ('django.db.models.fields.CharField', [], {'default': "'+'", 'max_length': '1'})
        },
        'annotation_server.ce10_wormbase': {
            'Meta': {'ordering': "['chrom', 'start']", 'object_name': 'ce10_WormBase'},
            'attribute': ('django.db.models.fields.TextField', [], {}),
            'cds': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'clone': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'end': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'feature': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'frame': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'gene': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'score': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'source': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'start': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'})
        },
        'annotation_server.dm3_chrominfo': {
            'Meta': {'ordering': "['-size']", 'object_name': 'dm3_ChromInfo'},
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'fileName': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'size': ('django.db.models.fields.IntegerField', [], {})
        },
        'annotation_server.dm3_conservation': {
            'Meta': {'ordering': "['chrom', 'position']", 'object_name': 'dm3_Conservation'},
            'annot': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['annotation_server.WigDescription']"}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'position': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'value': ('django.db.models.fields.FloatField', [], {})
        },
        'annotation_server.dm3_cytoband': {
            'Meta': {'ordering': "['chrom', 'chromStart']", 'object_name': 'dm3_CytoBand'},
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'chromEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'chromStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'gieStain': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'})
        },
        'annotation_server.dm3_ensgene': {
            'Meta': {'ordering': "['chrom', 'txStart']", 'object_name': 'dm3_EnsGene'},
            'bin': ('django.db.models.fields.IntegerField', [], {}),
            'cdsEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'cdsEndStat': ('django.db.models.fields.CharField', [], {'max_length': '10', 'db_index': 'True'}),
            'cdsStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'cdsStartStat': ('django.db.models.fields.CharField', [], {'max_length': '10', 'db_index': 'True'}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'exonCount': ('django.db.models.fields.IntegerField', [], {}),
            'exonEnds': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700', 'db_index': 'True'}),
            'exonFrames': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700'}),
            'exonStarts': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700', 'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'name2': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'score': ('django.db.models.fields.IntegerField', [], {}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'txEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'txStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'})
        },
        'annotation_server.dm3_flybase': {
            'Alias': ('django.db.models.fields.TextField', [], {}),
            'Meta': {'ordering': "['chrom', 'start']", 'object_name': 'dm3_FlyBase'},
            'attribute': ('django.db.models.fields.TextField', [], {}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'description': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'end': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'feature': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'frame': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'fullname': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'score': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'source': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'start': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'symbol': ('django.db.models.fields.CharField', [], {'max_length': '100'})
        },
        'annotation_server.dm3_gapregions': {
            'Meta': {'ordering': "['chrom', 'chromStart']", 'object_name': 'dm3_GapRegions'},
            'bin': ('django.db.models.fields.IntegerField', [], {}),
            'bridge': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'chromEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'chromStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'ix': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'n': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'size': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'type': ('django.db.models.fields.CharField', [], {'max_length': '255'})
        },
        'annotation_server.dm3_gc': {
            'Meta': {'ordering': "['chrom', 'position']", 'object_name': 'dm3_GC'},
            'annot': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['annotation_server.WigDescription']"}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'position': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'value': ('django.db.models.fields.FloatField', [], {})
        },
        'annotation_server.dm3_mappabilityempirial': {
            'Meta': {'ordering': "['chrom', 'chromStart']", 'object_name': 'dm3_MappabilityEmpirial'},
            'blockCount': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'blockSizes': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700'}),
            'blockStarts': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700'}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'chromEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'chromStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'itemRgb': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'score': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'thickEnd': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'thickStart': ('django.db.models.fields.IntegerField', [], {'null': 'True'})
        },
        'annotation_server.dm3_sequence': {
            'Meta': {'object_name': 'dm3_Sequence'},
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '255', 'db_index': 'True'}),
            'seq': ('django.db.models.fields.TextField', [], {}),
            'seq_id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'strand': ('django.db.models.fields.CharField', [], {'default': "'+'", 'max_length': '1'})
        },
        'annotation_server.genomebuild': {
            'Meta': {'object_name': 'GenomeBuild'},
            'affiliation': ('django.db.models.fields.CharField', [], {'default': "'UCSC'", 'max_length': '255'}),
            'available': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'default_build': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'description': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'html_path': ('django.db.models.fields.CharField', [], {'max_length': '1024', 'null': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '255'}),
            'source_name': ('django.db.models.fields.CharField', [], {'max_length': '1024', 'null': 'True', 'blank': 'True'}),
            'species': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['annotation_server.Taxon']"}),
            'ucsc_equivalent': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['annotation_server.GenomeBuild']", 'null': 'True', 'blank': 'True'})
        },
        'annotation_server.hg19_chrominfo': {
            'Meta': {'ordering': "['-size']", 'object_name': 'hg19_ChromInfo'},
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'fileName': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'size': ('django.db.models.fields.IntegerField', [], {})
        },
        'annotation_server.hg19_conservation': {
            'Meta': {'ordering': "['chrom', 'position']", 'object_name': 'hg19_Conservation'},
            'annot': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['annotation_server.WigDescription']"}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'position': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'value': ('django.db.models.fields.FloatField', [], {})
        },
        'annotation_server.hg19_cytoband': {
            'Meta': {'ordering': "['chrom', 'chromStart']", 'object_name': 'hg19_CytoBand'},
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'chromEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'chromStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'gieStain': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'})
        },
        'annotation_server.hg19_ensgene': {
            'Meta': {'ordering': "['chrom', 'txStart']", 'object_name': 'hg19_EnsGene'},
            'bin': ('django.db.models.fields.IntegerField', [], {}),
            'cdsEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'cdsEndStat': ('django.db.models.fields.CharField', [], {'max_length': '10', 'db_index': 'True'}),
            'cdsStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'cdsStartStat': ('django.db.models.fields.CharField', [], {'max_length': '10', 'db_index': 'True'}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'exonCount': ('django.db.models.fields.IntegerField', [], {}),
            'exonEnds': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700', 'db_index': 'True'}),
            'exonFrames': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700'}),
            'exonStarts': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700', 'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'name2': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'score': ('django.db.models.fields.IntegerField', [], {}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'txEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'txStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'})
        },
        'annotation_server.hg19_gapregions': {
            'Meta': {'ordering': "['chrom', 'chromStart']", 'object_name': 'hg19_GapRegions'},
            'bin': ('django.db.models.fields.IntegerField', [], {}),
            'bridge': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'chromEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'chromStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'ix': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'n': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'size': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'type': ('django.db.models.fields.CharField', [], {'max_length': '255'})
        },
        'annotation_server.hg19_gc': {
            'Meta': {'ordering': "['chrom', 'position']", 'object_name': 'hg19_GC'},
            'annot': ('django.db.models.fields.related.ForeignKey', [], {'to': "orm['annotation_server.WigDescription']"}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'position': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'value': ('django.db.models.fields.FloatField', [], {})
        },
        'annotation_server.hg19_gencode': {
            'Meta': {'object_name': 'hg19_GenCode'},
            'attribute': ('django.db.models.fields.TextField', [], {}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'end': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'feature': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'frame': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'gene_id': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'gene_name': ('django.db.models.fields.CharField', [], {'max_length': '100', 'db_index': 'True'}),
            'gene_status': ('django.db.models.fields.CharField', [], {'max_length': '100', 'db_index': 'True'}),
            'gene_type': ('django.db.models.fields.CharField', [], {'max_length': '100', 'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'score': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'source': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'start': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'transcript_id': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'transcript_name': ('django.db.models.fields.CharField', [], {'max_length': '100', 'db_index': 'True'}),
            'transcript_status': ('django.db.models.fields.CharField', [], {'max_length': '100', 'db_index': 'True'}),
            'transcript_type': ('django.db.models.fields.CharField', [], {'max_length': '100', 'db_index': 'True'})
        },
        'annotation_server.hg19_mappabilityempirial': {
            'Meta': {'ordering': "['chrom', 'chromStart']", 'object_name': 'hg19_MappabilityEmpirial'},
            'blockCount': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'blockSizes': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700'}),
            'blockStarts': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700'}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'chromEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'chromStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'itemRgb': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'score': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'thickEnd': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'thickStart': ('django.db.models.fields.IntegerField', [], {'null': 'True'})
        },
        'annotation_server.hg19_mappabilitytheoretical': {
            'Meta': {'ordering': "['chrom', 'chromStart']", 'object_name': 'hg19_MappabilityTheoretical'},
            'blockCount': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'blockSizes': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700'}),
            'blockStarts': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700'}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'chromEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'chromStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'itemRgb': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'score': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'thickEnd': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'thickStart': ('django.db.models.fields.IntegerField', [], {'null': 'True'})
        },
        'annotation_server.hg19_sequence': {
            'Meta': {'object_name': 'hg19_Sequence'},
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '255', 'db_index': 'True'}),
            'seq': ('django.db.models.fields.TextField', [], {}),
            'seq_id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'strand': ('django.db.models.fields.CharField', [], {'default': "'+'", 'max_length': '1'})
        },
        'annotation_server.taxon': {
            'Meta': {'unique_together': "(('taxon_id', 'name'),)", 'object_name': 'Taxon'},
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '1024'}),
            'taxon_id': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'type': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'unique_name': ('django.db.models.fields.CharField', [], {'max_length': '1024', 'null': 'True', 'blank': 'True'})
        },
        'annotation_server.wigdescription': {
            'Meta': {'object_name': 'WigDescription'},
            'altColor': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'annotation_type': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'color': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'description': ('django.db.models.fields.TextField', [], {}),
            'genome_build': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '1024'}),
            'priority': ('django.db.models.fields.IntegerField', [], {}),
            'type': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'visibility': ('django.db.models.fields.CharField', [], {'max_length': '255'})
        }
    }

    complete_apps = ['annotation_server']