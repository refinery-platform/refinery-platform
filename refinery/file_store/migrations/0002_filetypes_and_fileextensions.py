# encoding: utf8
import json
from django.core import serializers
from django.db import models, migrations


def forwards(apps, schema_editor):
    Filetype = apps.get_model("file_store", "Filetype")
    FileExtension = apps.get_model("file_store", "FileExtension")

    filetypes = [
        Filetype(
            pk=1,
            description="Binary compressed SAM",
            name="BAM",
            used_for_visualization=True),
        Filetype(
            pk=2,
            description="BED file",
            name="BED",
            used_for_visualization=True),
        Filetype(
            pk=3,
            description="Big BED",
            name="BIGBED"),
        Filetype(
            pk=4,
            description="Big WIG",
            name="BIGWIG",
            used_for_visualization=True),
        Filetype(
            pk=5,
            description="Circular Binary Segmentation File",
            name="CBS"),
        Filetype(
            pk=6,
            description="Affymetrix Probe Results File",
            name="CEL"),
        Filetype(
            pk=7,
            description="Comma Separated Values",
            name="CSV"),
        Filetype(
            pk=8,
            description="Eland file",
            name="ELAND"),
        Filetype(
            pk=9,
            description="GFF file",
            name="GFF",
            used_for_visualization=True),
        Filetype(
            pk=10,
            description="GTF file",
            name="GTF"),
        Filetype(
            pk=11,
            description="Gzip compressed archive",
            name="GZ"),
        Filetype(
            pk=12,
            description="Hypertext Markup Language",
            name="HTML"),
        Filetype(
            pk=13,
            description="IDF file",
            name="IDF"),
        Filetype(
            pk=14,
            description="FASTA file",
            name="FASTA"),
        Filetype(
            pk=15,
            description="FASTQ file",
            name="FASTQ"),
        Filetype(
            pk=16,
            description="FASTQC Sanger",
            name="FASTQCSANGER"),
        Filetype(
            pk=17,
            description="FASTQ Illumina",
            name="FASTQILLUMINA"),
        Filetype(
            pk=18,
            description="FASTQ Sanger",
            name="FASTQSANGER"),
        Filetype(
            pk=19,
            description="FASTQ Solexa",
            name="FASTQSOLEXA"),
        Filetype(
            pk=20,
            description="Portable Document Format",
            name="PDF"),
        Filetype(
            pk=21,
            description="Sequence Alignment/Map",
            name="SAM"),
        Filetype(
            pk=22,
            description="Segmented Data File",
            name="SEG",
            used_for_visualization=True),
        Filetype(
            pk=23,
            description="Tabular file",
            name="TABULAR"),
        Filetype(
            pk=24,
            description="TDF file",
            name="TDF",
            used_for_visualization=True),
        Filetype(
            pk=25,
            description="Gzip compressed tar archive",
            name="TGZ"),
        Filetype(
            pk=26,
            description="Text file",
            name="TXT"),
        Filetype(
            pk=27,
            description="Variant Call Format",
            name="VCF",
            used_for_visualization=True),
        Filetype(
            pk=28,
            description="Wiggle Track Format",
            name="WIG",
            used_for_visualization=True),
        Filetype(
            pk=29,
            description="XML file",
            name="XML"),
        Filetype(
            pk=32,
            description="Zip compressed archive",
            name="ZIP"),
        Filetype(
            pk=34,
            description="FASTQ.GZ file",
            name="FASTQ.GZ"),
        Filetype(
            pk=35,
            description="GCT file",
            name="GCT"),
        Filetype(
            pk=37,
            description="DAT file",
            name="DAT"),
        Filetype(
            pk=38,
            description="Illumina basecall file",
            name="BCL"),
        Filetype(
            pk=39,
            description="Illumina basecall file gzipped",
            name="BCL GZip file"),
        Filetype(
            pk=40,
            description="Illumina basecall file tarred + gzipped",
            name="BCL TGZ file"),
        Filetype(
            pk=41,
            description="BAM index file",
            name="BAI file",
            used_for_visualization=True)
        ]
    file_extensions = [
        FileExtension(
            pk=1,
            name="bam",
            filetype=1),
        FileExtension(
            pk=2,
            name="bed",
            filetype=2),
        FileExtension(
            pk=3,
            name="bigbed",
            filetype=3),
        FileExtension(
            pk=4,
            name="bigwig",
            filetype=4),
        FileExtension(
            pk=5,
            name="cbs",
            filetype=5),
        FileExtension(
            pk=6,
            name="cel",
            filetype=6),
        FileExtension(
            pk=7,
            name="csv",
            filetype=7),
        FileExtension(
            pk=8,
            name="eland",
            filetype=8),
        FileExtension(
            pk=9,
            name="gff",
            filetype=9),
        FileExtension(
            pk=10,
            name="gtf",
            filetype=10),
        FileExtension(
            pk=11,
            name="gz",
            filetype=11),
        FileExtension(
            pk=12,
            name="html",
            filetype=12),
        FileExtension(
            pk=13,
            name="idf",
            filetype=13),
        FileExtension(
            pk=14,
            name="fasta",
            filetype=14),
        FileExtension(
            pk=15,
            name="fastq",
            filetype=15),
        FileExtension(
            pk=16,
            name="fastqcsanger",
            filetype=16),
        FileExtension(
            pk=17,
            name="fastqillumina",
            filetype=17),
        FileExtension(
            pk=18,
            name="fastqsanger",
            filetype=18),
        FileExtension(
            pk=19,
            name="fastqsolexa",
            filetype=19),
        FileExtension(
            pk=20,
            name="pdf",
            filetype=20),
        FileExtension(
            pk=21,
            name="sam",
            filetype=21),
        FileExtension(
            pk=22,
            name="seg",
            filetype=22),
        FileExtension(
            pk=23,
            name="tabular",
            filetype=23),
        FileExtension(
            pk=24,
            name="tdf",
            filetype=24),
        FileExtension(
            pk=25,
            name="tgz",
            filetype=25),
        FileExtension(
            pk=26,
            name="txt",
            filetype=26),
        FileExtension(
            pk=27,
            name="vcf",
            filetype=27),
        FileExtension(
            pk=28,
            name="wig",
            filetype=28),
        FileExtension(
            pk=29,
            name="xml",
            filetype=29),
        FileExtension(
            pk=30,
            name="bb",
            filetype=3),
        FileExtension(
            pk=31,
            name="igv.tdf",
            filetype=24),
        FileExtension(
            pk=32,
            name="zip",
            filetype=32),
        FileExtension(
            pk=34,
            name="fastq.gz",
            filetype=34),
        FileExtension(
            pk=35,
            name="gct",
            filetype=35),
        FileExtension(
            pk=38,
            name="fq",
            filetype=15),
        FileExtension(
            pk=39,
            name="bcl",
            filetype=38),
        FileExtension(
            pk=39,
            name="bcl.gz",
            filetype=39),
        FileExtension(
            pk=40,
            name="bcl.tgz",
            filetype=40),
        FileExtension(
            pk=41,
            name="bai",
            filetype=41)
    ]
    for filetype in filetypes:
        filetype.get_or_create()
    for file_extension in file_extensions:
        file_extension.get_or_create()


def backwards(apps, schema_editor):
    "Brutally deleting all entries for this model..."
    Filetype = apps.get_model("file_store", "Filetype")
    FileExtension = apps.get_model("file_store", "FileExtension")
    Filetype.objects.all().delete()
    FileExtension.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('file_store', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards)
    ]