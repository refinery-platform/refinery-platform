# encoding: utf8
from django.db import migrations, transaction, IntegrityError


def forwards(apps, schema_editor):
    Filetype = apps.get_model("file_store", "Filetype")
    FileExtension = apps.get_model("file_store", "FileExtension")

    filetypes = [
        Filetype(
            description="Binary compressed SAM",
            name="BAM",
            used_for_visualization=True),
        Filetype(
            description="BED file",
            name="BED",
            used_for_visualization=True),
        Filetype(
            description="Big BED",
            name="BIGBED"),
        Filetype(
            description="Big WIG",
            name="BIGWIG",
            used_for_visualization=True),
        Filetype(
            description="Circular Binary Segmentation File",
            name="CBS"),
        Filetype(
            description="Affymetrix Probe Results File",
            name="CEL"),
        Filetype(
            description="Comma Separated Values",
            name="CSV"),
        Filetype(
            description="Eland file",
            name="ELAND"),
        Filetype(
            description="GFF file",
            name="GFF",
            used_for_visualization=True),
        Filetype(
            description="GTF file",
            name="GTF"),
        Filetype(
            description="Gzip compressed archive",
            name="GZ"),
        Filetype(
            description="Hypertext Markup Language",
            name="HTML"),
        Filetype(
            description="IDF file",
            name="IDF"),
        Filetype(
            description="FASTA file",
            name="FASTA"),
        Filetype(
            description="FASTQ file",
            name="FASTQ"),
        Filetype(
            description="FASTQC Sanger",
            name="FASTQCSANGER"),
        Filetype(
            description="FASTQ Illumina",
            name="FASTQILLUMINA"),
        Filetype(
            description="FASTQ Sanger",
            name="FASTQSANGER"),
        Filetype(
            description="FASTQ Solexa",
            name="FASTQSOLEXA"),
        Filetype(
            description="Portable Document Format",
            name="PDF"),
        Filetype(
            description="Sequence Alignment/Map",
            name="SAM"),
        Filetype(
            description="Segmented Data File",
            name="SEG",
            used_for_visualization=True),
        Filetype(
            description="Tabular file",
            name="TABULAR"),
        Filetype(
            description="TDF file",
            name="TDF",
            used_for_visualization=True),
        Filetype(
            description="Gzip compressed tar archive",
            name="TGZ"),
        Filetype(
            description="Text file",
            name="TXT"),
        Filetype(
            description="Variant Call Format",
            name="VCF",
            used_for_visualization=True),
        Filetype(
            description="Wiggle Track Format",
            name="WIG",
            used_for_visualization=True),
        Filetype(
            description="XML file",
            name="XML"),
        Filetype(
            description="Zip compressed archive",
            name="ZIP"),
        Filetype(
            description="FASTQ.GZ file",
            name="FASTQ.GZ"),
        Filetype(
            description="GCT file",
            name="GCT"),
        Filetype(
            description="DAT file",
            name="DAT"),
        Filetype(
            description="Illumina basecall file",
            name="BCL"),
        Filetype(
            description="Illumina basecall file gzipped",
            name="BCL GZip file"),
        Filetype(
            description="Illumina basecall file tarred + gzipped",
            name="BCL TGZ file"),
        Filetype(
            description="BAM index file",
            name="BAI file",
            used_for_visualization=True),
        Filetype(
            description="Cooler file",
            name="COOLER",
            used_for_visualization=True
        ),
        Filetype(
            description="HITILE file",
            name="HITILE",
            used_for_visualization=True
        ),
        Filetype(
            description="BEDGRAPH file",
            name="BEDGRAPH",
            used_for_visualization=True
        )
    ]

    existing_filetypes = [filetype.name for filetype in Filetype.objects.all()]

    for filetype in filetypes:
        if filetype.name in existing_filetypes:
            # The unique constraint on the name field is not
            # enforced when prior migrations have been "faked"
            # (like when bringing up a stack referencing prior backups on AWS)
            # so we don't want to save duplicate objects here
            continue
        else:
            filetype.save()

    file_extensions = [
        FileExtension(
            name="bam",
            filetype=Filetype.objects.get(name="BAM")
        ),
        FileExtension(
            name="bed",
            filetype=Filetype.objects.get(name="BED")
        ),
        FileExtension(
            name="bigbed",
            filetype=Filetype.objects.get(name="BIGBED")
        ),
        FileExtension(
            name="bigwig",
            filetype=Filetype.objects.get(name="BIGWIG")
        ),
        FileExtension(
            name="cbs",
            filetype=Filetype.objects.get(name="CBS")
        ),
        FileExtension(
            name="cel",
            filetype=Filetype.objects.get(name="CEL")
        ),
        FileExtension(
            name="csv",
            filetype=Filetype.objects.get(name="CSV")
        ),
        FileExtension(
            name="eland",
            filetype=Filetype.objects.get(name="ELAND")
        ),
        FileExtension(
            name="gff",
            filetype=Filetype.objects.get(name="GFF")
        ),
        FileExtension(
            name="gtf",
            filetype=Filetype.objects.get(name="GTF")
        ),
        FileExtension(
            name="gz",
            filetype=Filetype.objects.get(name="GZ")
        ),
        FileExtension(
            name="html",
            filetype=Filetype.objects.get(name="HTML")
        ),
        FileExtension(
            name="idf",
            filetype=Filetype.objects.get(name="IDF")
        ),
        FileExtension(
            name="fasta",
            filetype=Filetype.objects.get(name="FASTA")
        ),
        FileExtension(
            name="fastq",
            filetype=Filetype.objects.get(name="FASTQ")
        ),
        FileExtension(
            name="fastqcsanger",
            filetype=Filetype.objects.get(name="FASTQCSANGER")
        ),
        FileExtension(
            name="fastqillumina",
            filetype=Filetype.objects.get(name="FASTQILLUMINA")
        ),
        FileExtension(
            name="fastqsanger",
            filetype=Filetype.objects.get(name="FASTQSANGER")
        ),
        FileExtension(
            name="fastqsolexa",
            filetype=Filetype.objects.get(name="FASTQSOLEXA")
        ),
        FileExtension(
            name="pdf",
            filetype=Filetype.objects.get(name="PDF")
        ),
        FileExtension(
            name="sam",
            filetype=Filetype.objects.get(name="SAM")
        ),
        FileExtension(
            name="seg",
            filetype=Filetype.objects.get(name="SEG")
        ),
        FileExtension(
            name="tabular",
            filetype=Filetype.objects.get(name="TABULAR")
        ),
        FileExtension(
            name="tdf",
            filetype=Filetype.objects.get(name="TDF")
        ),
        FileExtension(
            name="tgz",
            filetype=Filetype.objects.get(name="TGZ")
        ),
        FileExtension(
            name="txt",
            filetype=Filetype.objects.get(name="TXT")
        ),
        FileExtension(
            name="vcf",
            filetype=Filetype.objects.get(name="VCF")
        ),
        FileExtension(
            name="wig",
            filetype=Filetype.objects.get(name="WIG")
        ),
        FileExtension(
            name="xml",
            filetype=Filetype.objects.get(name="XML")
        ),
        FileExtension(
            name="bb",
            filetype=Filetype.objects.get(name="BIGBED")
        ),
        FileExtension(
            name="igv.tdf",
            filetype=Filetype.objects.get(name="TDF")
        ),
        FileExtension(
            name="zip",
            filetype=Filetype.objects.get(name="ZIP")
        ),
        FileExtension(
            name="fastq.gz",
            filetype=Filetype.objects.get(name="FASTQ.GZ")
        ),
        FileExtension(
            name="gct",
            filetype=Filetype.objects.get(name="GCT")
        ),
        FileExtension(
            name="fq",
            filetype=Filetype.objects.get(name="FASTQ")
        ),
        FileExtension(
            name="bcl",
            filetype=Filetype.objects.get(name="BCL")
        ),
        FileExtension(
            name="bcl.gz",
            filetype=Filetype.objects.get(name="BCL GZip file")
        ),
        FileExtension(
            name="bcl.tgz",
            filetype=Filetype.objects.get(name="BCL TGZ file")
        ),
        FileExtension(
            name="bai",
            filetype=Filetype.objects.get(name="BAI file")
        ),
        FileExtension(
            name="bw",
            filetype=Filetype.objects.get(name="BIGWIG")
        ),
        FileExtension(
            name="hitile",
            filetype=Filetype.objects.get(name="HITILE")
        ),
        FileExtension(
            name="cool",
            filetype=Filetype.objects.get(name="COOLER")
        ),
        FileExtension(
            name="bedgraph",
            filetype=Filetype.objects.get(name="BEDGRAPH")
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
    Filetype = apps.get_model("file_store", "Filetype")
    FileExtension = apps.get_model("file_store", "FileExtension")
    FileExtension.objects.all().delete()
    Filetype.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('file_store', '0002_filetypes_and_fileextensions'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards)
    ]