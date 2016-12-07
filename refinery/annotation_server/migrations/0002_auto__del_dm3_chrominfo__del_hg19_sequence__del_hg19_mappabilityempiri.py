# -*- coding: utf-8 -*-
from south.utils import datetime_utils as datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Deleting model 'dm3_ChromInfo'
        db.delete_table(u'annotation_server_dm3_chrominfo')

        # Deleting model 'hg19_Sequence'
        db.delete_table(u'annotation_server_hg19_sequence')

        # Deleting model 'hg19_MappabilityEmpirial'
        db.delete_table(u'annotation_server_hg19_mappabilityempirial')

        # Deleting model 'hg19_GapRegions'
        db.delete_table(u'annotation_server_hg19_gapregions')

        # Deleting model 'hg19_CytoBand'
        db.delete_table(u'annotation_server_hg19_cytoband')

        # Deleting model 'ce10_GC'
        db.delete_table(u'annotation_server_ce10_gc')

        # Deleting model 'hg19_GC'
        db.delete_table(u'annotation_server_hg19_gc')

        # Deleting model 'ce10_MappabilityEmpirial'
        db.delete_table(u'annotation_server_ce10_mappabilityempirial')

        # Deleting model 'hg19_Conservation'
        db.delete_table(u'annotation_server_hg19_conservation')

        # Deleting model 'dm3_Conservation'
        db.delete_table(u'annotation_server_dm3_conservation')

        # Deleting model 'ce10_EnsGene'
        db.delete_table(u'annotation_server_ce10_ensgene')

        # Deleting model 'ce10_CytoBand'
        db.delete_table(u'annotation_server_ce10_cytoband')

        # Deleting model 'dm3_CytoBand'
        db.delete_table(u'annotation_server_dm3_cytoband')

        # Deleting model 'dm3_Sequence'
        db.delete_table(u'annotation_server_dm3_sequence')

        # Deleting model 'hg19_ChromInfo'
        db.delete_table(u'annotation_server_hg19_chrominfo')

        # Deleting model 'dm3_MappabilityEmpirial'
        db.delete_table(u'annotation_server_dm3_mappabilityempirial')

        # Deleting model 'ce10_Sequence'
        db.delete_table(u'annotation_server_ce10_sequence')

        # Deleting model 'dm3_GC'
        db.delete_table(u'annotation_server_dm3_gc')

        # Deleting model 'dm3_EnsGene'
        db.delete_table(u'annotation_server_dm3_ensgene')

        # Deleting model 'dm3_GapRegions'
        db.delete_table(u'annotation_server_dm3_gapregions')

        # Deleting model 'hg19_MappabilityTheoretical'
        db.delete_table(u'annotation_server_hg19_mappabilitytheoretical')

        # Deleting model 'ce10_ChromInfo'
        db.delete_table(u'annotation_server_ce10_chrominfo')

        # Deleting model 'hg19_EnsGene'
        db.delete_table(u'annotation_server_hg19_ensgene')

        # Deleting model 'ce10_Conservation'
        db.delete_table(u'annotation_server_ce10_conservation')

        # Adding model 'EmpiricalMappability'
        db.create_table(u'annotation_server_empiricalmappability', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('genomebuild', self.gf('django.db.models.fields.related.ForeignKey')(default=None, to=orm['annotation_server.GenomeBuild'], null=True)),
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
        db.send_create_signal(u'annotation_server', ['EmpiricalMappability'])

        # Adding model 'GCContent'
        db.create_table(u'annotation_server_gccontent', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('genomebuild', self.gf('django.db.models.fields.related.ForeignKey')(default=None, to=orm['annotation_server.GenomeBuild'], null=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('position', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('value', self.gf('django.db.models.fields.FloatField')()),
            ('annot', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.WigDescription'])),
        ))
        db.send_create_signal(u'annotation_server', ['GCContent'])

        # Adding model 'Gene'
        db.create_table(u'annotation_server_gene', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('genomebuild', self.gf('django.db.models.fields.related.ForeignKey')(default=None, to=orm['annotation_server.GenomeBuild'], null=True)),
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
        db.send_create_signal(u'annotation_server', ['Gene'])

        # Adding model 'GapRegionFile'
        db.create_table(u'annotation_server_gapregionfile', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('genomebuild', self.gf('django.db.models.fields.related.ForeignKey')(default=None, to=orm['annotation_server.GenomeBuild'], null=True)),
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
        db.send_create_signal(u'annotation_server', ['GapRegionFile'])

        # Adding model 'ConservationTrack'
        db.create_table(u'annotation_server_conservationtrack', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('genomebuild', self.gf('django.db.models.fields.related.ForeignKey')(default=None, to=orm['annotation_server.GenomeBuild'], null=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('position', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('value', self.gf('django.db.models.fields.FloatField')()),
            ('annot', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.WigDescription'])),
        ))
        db.send_create_signal(u'annotation_server', ['ConservationTrack'])

        # Adding model 'ChromInfo'
        db.create_table(u'annotation_server_chrominfo', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('genomebuild', self.gf('django.db.models.fields.related.ForeignKey')(default=None, to=orm['annotation_server.GenomeBuild'], null=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('size', self.gf('django.db.models.fields.IntegerField')()),
            ('fileName', self.gf('django.db.models.fields.CharField')(max_length=255)),
        ))
        db.send_create_signal(u'annotation_server', ['ChromInfo'])

        # Adding model 'TheoreticalMappability'
        db.create_table(u'annotation_server_theoreticalmappability', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('genomebuild', self.gf('django.db.models.fields.related.ForeignKey')(default=None, to=orm['annotation_server.GenomeBuild'], null=True)),
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
        db.send_create_signal(u'annotation_server', ['TheoreticalMappability'])

        # Adding model 'CytoBand'
        db.create_table(u'annotation_server_cytoband', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('genomebuild', self.gf('django.db.models.fields.related.ForeignKey')(default=None, to=orm['annotation_server.GenomeBuild'], null=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('gieStain', self.gf('django.db.models.fields.CharField')(max_length=255)),
        ))
        db.send_create_signal(u'annotation_server', ['CytoBand'])

        # Adding field 'dm3_FlyBase.genomebuild'
        db.add_column(u'annotation_server_dm3_flybase', 'genomebuild',
                      self.gf('django.db.models.fields.related.ForeignKey')(default=None, to=orm['annotation_server.GenomeBuild'], null=True),
                      keep_default=False)

        # Adding field 'hg19_GenCode.genomebuild'
        db.add_column(u'annotation_server_hg19_gencode', 'genomebuild',
                      self.gf('django.db.models.fields.related.ForeignKey')(default=None, to=orm['annotation_server.GenomeBuild'], null=True),
                      keep_default=False)

        # Adding field 'ce10_WormBase.genomebuild'
        db.add_column(u'annotation_server_ce10_wormbase', 'genomebuild',
                      self.gf('django.db.models.fields.related.ForeignKey')(default=None, to=orm['annotation_server.GenomeBuild'], null=True),
                      keep_default=False)

        # Deleting field 'WigDescription.genome_build'
        db.delete_column(u'annotation_server_wigdescription', 'genome_build')

        # Adding field 'WigDescription.genomebuild'
        db.add_column(u'annotation_server_wigdescription', 'genomebuild',
                      self.gf('django.db.models.fields.related.ForeignKey')(default=None, to=orm['annotation_server.GenomeBuild'], null=True),
                      keep_default=False)

        # Deleting field 'GenomeBuild.ucsc_equivalent'
        db.delete_column(u'annotation_server_genomebuild', 'ucsc_equivalent_id')


    def backwards(self, orm):
        # Adding model 'dm3_ChromInfo'
        db.create_table(u'annotation_server_dm3_chrominfo', (
            ('size', self.gf('django.db.models.fields.IntegerField')()),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('fileName', self.gf('django.db.models.fields.CharField')(max_length=255)),
        ))
        db.send_create_signal('annotation_server', ['dm3_ChromInfo'])

        # Adding model 'hg19_Sequence'
        db.create_table(u'annotation_server_hg19_sequence', (
            ('seq_id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('strand', self.gf('django.db.models.fields.CharField')(default='+', max_length=1)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, unique=True, db_index=True)),
            ('seq', self.gf('django.db.models.fields.TextField')()),
        ))
        db.send_create_signal('annotation_server', ['hg19_Sequence'])

        # Adding model 'hg19_MappabilityEmpirial'
        db.create_table(u'annotation_server_hg19_mappabilityempirial', (
            ('blockStarts', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
            ('blockSizes', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('score', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('blockCount', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('itemRgb', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('thickEnd', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('thickStart', self.gf('django.db.models.fields.IntegerField')(null=True)),
        ))
        db.send_create_signal('annotation_server', ['hg19_MappabilityEmpirial'])

        # Adding model 'hg19_GapRegions'
        db.create_table(u'annotation_server_hg19_gapregions', (
            ('bin', self.gf('django.db.models.fields.IntegerField')()),
            ('bridge', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('ix', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('size', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('n', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('type', self.gf('django.db.models.fields.CharField')(max_length=255)),
        ))
        db.send_create_signal('annotation_server', ['hg19_GapRegions'])

        # Adding model 'hg19_CytoBand'
        db.create_table(u'annotation_server_hg19_cytoband', (
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('gieStain', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
        ))
        db.send_create_signal('annotation_server', ['hg19_CytoBand'])

        # Adding model 'ce10_GC'
        db.create_table(u'annotation_server_ce10_gc', (
            ('annot', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.WigDescription'])),
            ('value', self.gf('django.db.models.fields.FloatField')()),
            ('position', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
        ))
        db.send_create_signal('annotation_server', ['ce10_GC'])

        # Adding model 'hg19_GC'
        db.create_table(u'annotation_server_hg19_gc', (
            ('annot', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.WigDescription'])),
            ('value', self.gf('django.db.models.fields.FloatField')()),
            ('position', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
        ))
        db.send_create_signal('annotation_server', ['hg19_GC'])

        # Adding model 'ce10_MappabilityEmpirial'
        db.create_table(u'annotation_server_ce10_mappabilityempirial', (
            ('blockStarts', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
            ('blockSizes', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('score', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('blockCount', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('itemRgb', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('thickEnd', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('thickStart', self.gf('django.db.models.fields.IntegerField')(null=True)),
        ))
        db.send_create_signal('annotation_server', ['ce10_MappabilityEmpirial'])

        # Adding model 'hg19_Conservation'
        db.create_table(u'annotation_server_hg19_conservation', (
            ('annot', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.WigDescription'])),
            ('value', self.gf('django.db.models.fields.FloatField')()),
            ('position', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
        ))
        db.send_create_signal('annotation_server', ['hg19_Conservation'])

        # Adding model 'dm3_Conservation'
        db.create_table(u'annotation_server_dm3_conservation', (
            ('annot', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.WigDescription'])),
            ('value', self.gf('django.db.models.fields.FloatField')()),
            ('position', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
        ))
        db.send_create_signal('annotation_server', ['dm3_Conservation'])

        # Adding model 'ce10_EnsGene'
        db.create_table(u'annotation_server_ce10_ensgene', (
            ('bin', self.gf('django.db.models.fields.IntegerField')()),
            ('txEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('exonFrames', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('txStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('exonCount', self.gf('django.db.models.fields.IntegerField')()),
            ('cdsEndStat', self.gf('django.db.models.fields.CharField')(max_length=10, db_index=True)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('cdsEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('name2', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('exonStarts', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700, db_index=True)),
            ('cdsStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('cdsStartStat', self.gf('django.db.models.fields.CharField')(max_length=10, db_index=True)),
            ('score', self.gf('django.db.models.fields.IntegerField')()),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('exonEnds', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700, db_index=True)),
        ))
        db.send_create_signal('annotation_server', ['ce10_EnsGene'])

        # Adding model 'ce10_CytoBand'
        db.create_table(u'annotation_server_ce10_cytoband', (
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('gieStain', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
        ))
        db.send_create_signal('annotation_server', ['ce10_CytoBand'])

        # Adding model 'dm3_CytoBand'
        db.create_table(u'annotation_server_dm3_cytoband', (
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('gieStain', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
        ))
        db.send_create_signal('annotation_server', ['dm3_CytoBand'])

        # Adding model 'dm3_Sequence'
        db.create_table(u'annotation_server_dm3_sequence', (
            ('seq_id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('strand', self.gf('django.db.models.fields.CharField')(default='+', max_length=1)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, unique=True, db_index=True)),
            ('seq', self.gf('django.db.models.fields.TextField')()),
        ))
        db.send_create_signal('annotation_server', ['dm3_Sequence'])

        # Adding model 'hg19_ChromInfo'
        db.create_table(u'annotation_server_hg19_chrominfo', (
            ('size', self.gf('django.db.models.fields.IntegerField')()),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('fileName', self.gf('django.db.models.fields.CharField')(max_length=255)),
        ))
        db.send_create_signal('annotation_server', ['hg19_ChromInfo'])

        # Adding model 'dm3_MappabilityEmpirial'
        db.create_table(u'annotation_server_dm3_mappabilityempirial', (
            ('blockStarts', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
            ('blockSizes', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('score', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('blockCount', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('itemRgb', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('thickEnd', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('thickStart', self.gf('django.db.models.fields.IntegerField')(null=True)),
        ))
        db.send_create_signal('annotation_server', ['dm3_MappabilityEmpirial'])

        # Adding model 'ce10_Sequence'
        db.create_table(u'annotation_server_ce10_sequence', (
            ('seq_id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('strand', self.gf('django.db.models.fields.CharField')(default='+', max_length=1)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, unique=True, db_index=True)),
            ('seq', self.gf('django.db.models.fields.TextField')()),
        ))
        db.send_create_signal('annotation_server', ['ce10_Sequence'])

        # Adding model 'dm3_GC'
        db.create_table(u'annotation_server_dm3_gc', (
            ('annot', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.WigDescription'])),
            ('value', self.gf('django.db.models.fields.FloatField')()),
            ('position', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
        ))
        db.send_create_signal('annotation_server', ['dm3_GC'])

        # Adding model 'dm3_EnsGene'
        db.create_table(u'annotation_server_dm3_ensgene', (
            ('bin', self.gf('django.db.models.fields.IntegerField')()),
            ('txEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('exonFrames', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('txStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('exonCount', self.gf('django.db.models.fields.IntegerField')()),
            ('cdsEndStat', self.gf('django.db.models.fields.CharField')(max_length=10, db_index=True)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('cdsEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('name2', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('exonStarts', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700, db_index=True)),
            ('cdsStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('cdsStartStat', self.gf('django.db.models.fields.CharField')(max_length=10, db_index=True)),
            ('score', self.gf('django.db.models.fields.IntegerField')()),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('exonEnds', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700, db_index=True)),
        ))
        db.send_create_signal('annotation_server', ['dm3_EnsGene'])

        # Adding model 'dm3_GapRegions'
        db.create_table(u'annotation_server_dm3_gapregions', (
            ('bin', self.gf('django.db.models.fields.IntegerField')()),
            ('bridge', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('ix', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('size', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('n', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('type', self.gf('django.db.models.fields.CharField')(max_length=255)),
        ))
        db.send_create_signal('annotation_server', ['dm3_GapRegions'])

        # Adding model 'hg19_MappabilityTheoretical'
        db.create_table(u'annotation_server_hg19_mappabilitytheoretical', (
            ('blockStarts', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
            ('blockSizes', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
            ('chromStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('score', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('chromEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('blockCount', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('itemRgb', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('thickEnd', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('thickStart', self.gf('django.db.models.fields.IntegerField')(null=True)),
        ))
        db.send_create_signal('annotation_server', ['hg19_MappabilityTheoretical'])

        # Adding model 'ce10_ChromInfo'
        db.create_table(u'annotation_server_ce10_chrominfo', (
            ('size', self.gf('django.db.models.fields.IntegerField')()),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('fileName', self.gf('django.db.models.fields.CharField')(max_length=255)),
        ))
        db.send_create_signal('annotation_server', ['ce10_ChromInfo'])

        # Adding model 'hg19_EnsGene'
        db.create_table(u'annotation_server_hg19_ensgene', (
            ('bin', self.gf('django.db.models.fields.IntegerField')()),
            ('txEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('exonFrames', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('txStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('exonCount', self.gf('django.db.models.fields.IntegerField')()),
            ('cdsEndStat', self.gf('django.db.models.fields.CharField')(max_length=10, db_index=True)),
            ('strand', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('cdsEnd', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('name2', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('exonStarts', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700, db_index=True)),
            ('cdsStart', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('cdsStartStat', self.gf('django.db.models.fields.CharField')(max_length=10, db_index=True)),
            ('score', self.gf('django.db.models.fields.IntegerField')()),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('exonEnds', self.gf('django.db.models.fields.CommaSeparatedIntegerField')(max_length=3700, db_index=True)),
        ))
        db.send_create_signal('annotation_server', ['hg19_EnsGene'])

        # Adding model 'ce10_Conservation'
        db.create_table(u'annotation_server_ce10_conservation', (
            ('annot', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.WigDescription'])),
            ('value', self.gf('django.db.models.fields.FloatField')()),
            ('position', self.gf('django.db.models.fields.IntegerField')(db_index=True)),
            ('chrom', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
        ))
        db.send_create_signal('annotation_server', ['ce10_Conservation'])

        # Deleting model 'EmpiricalMappability'
        db.delete_table(u'annotation_server_empiricalmappability')

        # Deleting model 'GCContent'
        db.delete_table(u'annotation_server_gccontent')

        # Deleting model 'Gene'
        db.delete_table(u'annotation_server_gene')

        # Deleting model 'GapRegionFile'
        db.delete_table(u'annotation_server_gapregionfile')

        # Deleting model 'ConservationTrack'
        db.delete_table(u'annotation_server_conservationtrack')

        # Deleting model 'ChromInfo'
        db.delete_table(u'annotation_server_chrominfo')

        # Deleting model 'TheoreticalMappability'
        db.delete_table(u'annotation_server_theoreticalmappability')

        # Deleting model 'CytoBand'
        db.delete_table(u'annotation_server_cytoband')

        # Deleting field 'dm3_FlyBase.genomebuild'
        db.delete_column(u'annotation_server_dm3_flybase', 'genomebuild_id')

        # Deleting field 'hg19_GenCode.genomebuild'
        db.delete_column(u'annotation_server_hg19_gencode', 'genomebuild_id')

        # Deleting field 'ce10_WormBase.genomebuild'
        db.delete_column(u'annotation_server_ce10_wormbase', 'genomebuild_id')

        # Adding field 'WigDescription.genome_build'
        db.add_column(u'annotation_server_wigdescription', 'genome_build',
                      self.gf('django.db.models.fields.CharField')(default=None, max_length=255),
                      keep_default=False)

        # Deleting field 'WigDescription.genomebuild'
        db.delete_column(u'annotation_server_wigdescription', 'genomebuild_id')

        # Adding field 'GenomeBuild.ucsc_equivalent'
        db.add_column(u'annotation_server_genomebuild', 'ucsc_equivalent',
                      self.gf('django.db.models.fields.related.ForeignKey')(to=orm['annotation_server.GenomeBuild'], null=True, blank=True),
                      keep_default=False)


    models = {
        u'annotation_server.ce10_wormbase': {
            'Meta': {'ordering': "['chrom', 'start']", 'object_name': 'ce10_WormBase'},
            'attribute': ('django.db.models.fields.TextField', [], {}),
            'cds': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'clone': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'end': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'feature': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'frame': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'gene': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'genomebuild': ('django.db.models.fields.related.ForeignKey', [], {'default': 'None', 'to': u"orm['annotation_server.GenomeBuild']", 'null': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'score': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'source': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'start': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'})
        },
        u'annotation_server.chrominfo': {
            'Meta': {'ordering': "['-size']", 'object_name': 'ChromInfo'},
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'fileName': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'genomebuild': ('django.db.models.fields.related.ForeignKey', [], {'default': 'None', 'to': u"orm['annotation_server.GenomeBuild']", 'null': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'size': ('django.db.models.fields.IntegerField', [], {})
        },
        u'annotation_server.conservationtrack': {
            'Meta': {'ordering': "['chrom', 'position']", 'object_name': 'ConservationTrack'},
            'annot': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['annotation_server.WigDescription']"}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'genomebuild': ('django.db.models.fields.related.ForeignKey', [], {'default': 'None', 'to': u"orm['annotation_server.GenomeBuild']", 'null': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'position': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'value': ('django.db.models.fields.FloatField', [], {})
        },
        u'annotation_server.cytoband': {
            'Meta': {'ordering': "['chrom', 'chromStart']", 'object_name': 'CytoBand'},
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'chromEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'chromStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'genomebuild': ('django.db.models.fields.related.ForeignKey', [], {'default': 'None', 'to': u"orm['annotation_server.GenomeBuild']", 'null': 'True'}),
            'gieStain': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'})
        },
        u'annotation_server.dm3_flybase': {
            'Alias': ('django.db.models.fields.TextField', [], {}),
            'Meta': {'ordering': "['chrom', 'start']", 'object_name': 'dm3_FlyBase'},
            'attribute': ('django.db.models.fields.TextField', [], {}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'description': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'end': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'feature': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'frame': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'fullname': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'genomebuild': ('django.db.models.fields.related.ForeignKey', [], {'default': 'None', 'to': u"orm['annotation_server.GenomeBuild']", 'null': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'score': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'source': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'start': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'symbol': ('django.db.models.fields.CharField', [], {'max_length': '100'})
        },
        u'annotation_server.empiricalmappability': {
            'Meta': {'ordering': "['chrom', 'chromStart']", 'object_name': 'EmpiricalMappability'},
            'blockCount': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'blockSizes': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700'}),
            'blockStarts': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700'}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'chromEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'chromStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'genomebuild': ('django.db.models.fields.related.ForeignKey', [], {'default': 'None', 'to': u"orm['annotation_server.GenomeBuild']", 'null': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'itemRgb': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'score': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'thickEnd': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'thickStart': ('django.db.models.fields.IntegerField', [], {'null': 'True'})
        },
        u'annotation_server.gapregionfile': {
            'Meta': {'ordering': "['chrom', 'chromStart']", 'object_name': 'GapRegionFile'},
            'bin': ('django.db.models.fields.IntegerField', [], {}),
            'bridge': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'chromEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'chromStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'genomebuild': ('django.db.models.fields.related.ForeignKey', [], {'default': 'None', 'to': u"orm['annotation_server.GenomeBuild']", 'null': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'ix': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'n': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'size': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'type': ('django.db.models.fields.CharField', [], {'max_length': '255'})
        },
        u'annotation_server.gccontent': {
            'Meta': {'ordering': "['chrom', 'position']", 'object_name': 'GCContent'},
            'annot': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['annotation_server.WigDescription']"}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'genomebuild': ('django.db.models.fields.related.ForeignKey', [], {'default': 'None', 'to': u"orm['annotation_server.GenomeBuild']", 'null': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'position': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'value': ('django.db.models.fields.FloatField', [], {})
        },
        u'annotation_server.gene': {
            'Meta': {'ordering': "['chrom', 'txStart']", 'object_name': 'Gene'},
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
            'genomebuild': ('django.db.models.fields.related.ForeignKey', [], {'default': 'None', 'to': u"orm['annotation_server.GenomeBuild']", 'null': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'name2': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'score': ('django.db.models.fields.IntegerField', [], {}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'txEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'txStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'})
        },
        u'annotation_server.genomebuild': {
            'Meta': {'object_name': 'GenomeBuild'},
            'affiliation': ('django.db.models.fields.CharField', [], {'default': "'UCSC'", 'max_length': '255'}),
            'available': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'default_build': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'description': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'html_path': ('django.db.models.fields.CharField', [], {'max_length': '1024', 'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '255'}),
            'source_name': ('django.db.models.fields.CharField', [], {'max_length': '1024', 'null': 'True', 'blank': 'True'}),
            'species': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['annotation_server.Taxon']"})
        },
        u'annotation_server.hg19_gencode': {
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
            'genomebuild': ('django.db.models.fields.related.ForeignKey', [], {'default': 'None', 'to': u"orm['annotation_server.GenomeBuild']", 'null': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'score': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'source': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'start': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'transcript_id': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'transcript_name': ('django.db.models.fields.CharField', [], {'max_length': '100', 'db_index': 'True'}),
            'transcript_status': ('django.db.models.fields.CharField', [], {'max_length': '100', 'db_index': 'True'}),
            'transcript_type': ('django.db.models.fields.CharField', [], {'max_length': '100', 'db_index': 'True'})
        },
        u'annotation_server.taxon': {
            'Meta': {'unique_together': "(('taxon_id', 'name'),)", 'object_name': 'Taxon'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '1024'}),
            'taxon_id': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'type': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'unique_name': ('django.db.models.fields.CharField', [], {'max_length': '1024', 'null': 'True', 'blank': 'True'})
        },
        u'annotation_server.theoreticalmappability': {
            'Meta': {'ordering': "['chrom', 'chromStart']", 'object_name': 'TheoreticalMappability'},
            'blockCount': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'blockSizes': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700'}),
            'blockStarts': ('django.db.models.fields.CommaSeparatedIntegerField', [], {'max_length': '3700'}),
            'chrom': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'chromEnd': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'chromStart': ('django.db.models.fields.IntegerField', [], {'db_index': 'True'}),
            'genomebuild': ('django.db.models.fields.related.ForeignKey', [], {'default': 'None', 'to': u"orm['annotation_server.GenomeBuild']", 'null': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'itemRgb': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'score': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'strand': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'thickEnd': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'thickStart': ('django.db.models.fields.IntegerField', [], {'null': 'True'})
        },
        u'annotation_server.wigdescription': {
            'Meta': {'object_name': 'WigDescription'},
            'altColor': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'annotation_type': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'color': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'description': ('django.db.models.fields.TextField', [], {}),
            'genomebuild': ('django.db.models.fields.related.ForeignKey', [], {'default': 'None', 'to': u"orm['annotation_server.GenomeBuild']", 'null': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '1024'}),
            'priority': ('django.db.models.fields.IntegerField', [], {}),
            'type': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'visibility': ('django.db.models.fields.CharField', [], {'max_length': '255'})
        }
    }

    complete_apps = ['annotation_server']