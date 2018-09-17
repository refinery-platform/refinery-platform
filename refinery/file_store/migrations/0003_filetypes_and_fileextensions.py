# encoding: utf8

from django.db import migrations, connection
from django.db.models import Max

def forwards(apps, schema_editor):
    FileType = apps.get_model("file_store", "FileType")
    FileExtension = apps.get_model("file_store", "FileExtension")

    if FileType.objects.count():
        # Workaround for old-fixture based FileType data messing up
        # Postgres' id sequence. See article here for similar issue:
        # https://www.vlent.nl/weblog/2011/05/06/integrityerror-duplicate-key-value-violates-unique-constraint/
        highest_id = FileType.objects.all().aggregate(Max('id'))["id__max"]
        with connection.cursor() as cursor:
            cursor.execute('alter sequence file_store_filetype_id_seq restart with {};'.format(highest_id + 1))

    filetypes = [
        FileType(
            description="Binary compressed SAM",
            name="BAM",
            used_for_visualization=True),
        FileType(
            description="BED file",
            name="BED",
            used_for_visualization=True),
        FileType(
            description="Big BED",
            name="BIGBED"),
        FileType(
            description="Big WIG",
            name="BIGWIG",
            used_for_visualization=True),
        FileType(
            description="Circular Binary Segmentation File",
            name="CBS"),
        FileType(
            description="Affymetrix Probe Results File",
            name="CEL"),
        FileType(
            description="Comma Separated Values",
            name="CSV"),
        FileType(
            description="Eland file",
            name="ELAND"),
        FileType(
            description="GFF file",
            name="GFF",
            used_for_visualization=True),
        FileType(
            description="GTF file",
            name="GTF"),
        FileType(
            description="Gzip compressed archive",
            name="GZ"),
        FileType(
            description="Hypertext Markup Language",
            name="HTML"),
        FileType(
            description="IDF file",
            name="IDF"),
        FileType(
            description="FASTA file",
            name="FASTA"),
        FileType(
            description="FASTQ file",
            name="FASTQ"),
        FileType(
            description="FASTQC Sanger",
            name="FASTQCSANGER"),
        FileType(
            description="FASTQ Illumina",
            name="FASTQILLUMINA"),
        FileType(
            description="FASTQ Sanger",
            name="FASTQSANGER"),
        FileType(
            description="FASTQ Solexa",
            name="FASTQSOLEXA"),
        FileType(
            description="Portable Document Format",
            name="PDF"),
        FileType(
            description="Sequence Alignment/Map",
            name="SAM"),
        FileType(
            description="Segmented Data File",
            name="SEG",
            used_for_visualization=True),
        FileType(
            description="Tabular file",
            name="TABULAR"),
        FileType(
            description="TDF file",
            name="TDF",
            used_for_visualization=True),
        FileType(
            description="Gzip compressed tar archive",
            name="TGZ"),
        FileType(
            description="Text file",
            name="TXT"),
        FileType(
            description="Variant Call Format",
            name="VCF",
            used_for_visualization=True),
        FileType(
            description="Wiggle Track Format",
            name="WIG",
            used_for_visualization=True),
        FileType(
            description="XML file",
            name="XML"),
        FileType(
            description="Zip compressed archive",
            name="ZIP"),
        FileType(
            description="FASTQ.GZ file",
            name="FASTQ.GZ"),
        FileType(
            description="GCT file",
            name="GCT"),
        FileType(
            description="DAT file",
            name="DAT"),
        FileType(
            description="Illumina basecall file",
            name="BCL"),
        FileType(
            description="Illumina basecall file gzipped",
            name="BCL GZip file"),
        FileType(
            description="Illumina basecall file tarred + gzipped",
            name="BCL TGZ file"),
        FileType(
            description="BAM index file",
            name="BAI file",
            used_for_visualization=True),
        FileType(
            description="Cooler file",
            name="COOLER",
            used_for_visualization=True
        ),
        FileType(
            description="HITILE file",
            name="HITILE",
            used_for_visualization=True
        ),
        FileType(
            description="BEDGRAPH file",
            name="BEDGRAPH",
            used_for_visualization=True
        )
    ]

    existing_filetypes = [filetype.name for filetype in FileType.objects.all()]

    for filetype in filetypes:
        if filetype.name in existing_filetypes:
            # The unique constraint on the name field is not
            # enforced when prior migrations have been "faked"
            # (like when bringing up a stack referencing prior backups on AWS)
            # so we don't want to save duplicate objects here
            continue
        else:
            filetype.save()

    if FileExtension.objects.count():
        # Workaround for old-fixture based FileExtension data messing up Postgres' id sequence.
        # See article here for similar issue:
        # https://www.vlent.nl/weblog/2011/05/06/integrityerror-duplicate-key-value-violates-unique-constraint/
        highest_id = FileExtension.objects.all().aggregate(Max('id'))["id__max"]
        with connection.cursor() as cursor:
            cursor.execute('alter sequence file_store_fileextension_id_seq restart with {};'.format(highest_id + 1))

    file_extensions = [
        FileExtension(
            name="bam",
            filetype=FileType.objects.get(name="BAM")
        ),
        FileExtension(
            name="bed",
            filetype=FileType.objects.get(name="BED")
        ),
        FileExtension(
            name="bigbed",
            filetype=FileType.objects.get(name="BIGBED")
        ),
        FileExtension(
            name="bigwig",
            filetype=FileType.objects.get(name="BIGWIG")
        ),
        FileExtension(
            name="cbs",
            filetype=FileType.objects.get(name="CBS")
        ),
        FileExtension(
            name="cel",
            filetype=FileType.objects.get(name="CEL")
        ),
        FileExtension(
            name="csv",
            filetype=FileType.objects.get(name="CSV")
        ),
        FileExtension(
            name="eland",
            filetype=FileType.objects.get(name="ELAND")
        ),
        FileExtension(
            name="gff",
            filetype=FileType.objects.get(name="GFF")
        ),
        FileExtension(
            name="gtf",
            filetype=FileType.objects.get(name="GTF")
        ),
        FileExtension(
            name="gz",
            filetype=FileType.objects.get(name="GZ")
        ),
        FileExtension(
            name="html",
            filetype=FileType.objects.get(name="HTML")
        ),
        FileExtension(
            name="idf",
            filetype=FileType.objects.get(name="IDF")
        ),
        FileExtension(
            name="fasta",
            filetype=FileType.objects.get(name="FASTA")
        ),
        FileExtension(
            name="fastq",
            filetype=FileType.objects.get(name="FASTQ")
        ),
        FileExtension(
            name="fastqcsanger",
            filetype=FileType.objects.get(name="FASTQCSANGER")
        ),
        FileExtension(
            name="fastqillumina",
            filetype=FileType.objects.get(name="FASTQILLUMINA")
        ),
        FileExtension(
            name="fastqsanger",
            filetype=FileType.objects.get(name="FASTQSANGER")
        ),
        FileExtension(
            name="fastqsolexa",
            filetype=FileType.objects.get(name="FASTQSOLEXA")
        ),
        FileExtension(
            name="pdf",
            filetype=FileType.objects.get(name="PDF")
        ),
        FileExtension(
            name="sam",
            filetype=FileType.objects.get(name="SAM")
        ),
        FileExtension(
            name="seg",
            filetype=FileType.objects.get(name="SEG")
        ),
        FileExtension(
            name="tabular",
            filetype=FileType.objects.get(name="TABULAR")
        ),
        FileExtension(
            name="tdf",
            filetype=FileType.objects.get(name="TDF")
        ),
        FileExtension(
            name="tgz",
            filetype=FileType.objects.get(name="TGZ")
        ),
        FileExtension(
            name="txt",
            filetype=FileType.objects.get(name="TXT")
        ),
        FileExtension(
            name="vcf",
            filetype=FileType.objects.get(name="VCF")
        ),
        FileExtension(
            name="wig",
            filetype=FileType.objects.get(name="WIG")
        ),
        FileExtension(
            name="xml",
            filetype=FileType.objects.get(name="XML")
        ),
        FileExtension(
            name="bb",
            filetype=FileType.objects.get(name="BIGBED")
        ),
        FileExtension(
            name="igv.tdf",
            filetype=FileType.objects.get(name="TDF")
        ),
        FileExtension(
            name="zip",
            filetype=FileType.objects.get(name="ZIP")
        ),
        FileExtension(
            name="fastq.gz",
            filetype=FileType.objects.get(name="FASTQ.GZ")
        ),
        FileExtension(
            name="gct",
            filetype=FileType.objects.get(name="GCT")
        ),
        FileExtension(
            name="fq",
            filetype=FileType.objects.get(name="FASTQ")
        ),
        FileExtension(
            name="bcl",
            filetype=FileType.objects.get(name="BCL")
        ),
        FileExtension(
            name="bcl.gz",
            filetype=FileType.objects.get(name="BCL GZip file")
        ),
        FileExtension(
            name="bcl.tgz",
            filetype=FileType.objects.get(name="BCL TGZ file")
        ),
        FileExtension(
            name="bai",
            filetype=FileType.objects.get(name="BAI file")
        ),
        FileExtension(
            name="bw",
            filetype=FileType.objects.get(name="BIGWIG")
        ),
        FileExtension(
            name="hitile",
            filetype=FileType.objects.get(name="HITILE")
        ),
        FileExtension(
            name="cool",
            filetype=FileType.objects.get(name="COOLER")
        ),
        FileExtension(
            name="bedgraph",
            filetype=FileType.objects.get(name="BEDGRAPH")
        )
    ]

    existing_file_extensions = [file_extension.name for file_extension in
                                FileExtension.objects.all()]

    for file_extension in file_extensions:
        if file_extension.name in existing_file_extensions:
            # The unique constraint on the name field is not
            # enforced when prior migrations have been "faked"
            # (like when bringing up a stack referencing prior backups on AWS)
            # so we don't want to save duplicate objects here
            continue
        else:
            file_extension.save()


def backwards(apps, schema_editor):
    FileType = apps.get_model("file_store", "FileType")
    FileExtension = apps.get_model("file_store", "FileExtension")
    FileExtension.objects.all().delete()
    FileType.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('file_store', '0002_filetypes_and_fileextensions'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards)
    ]