# encoding: utf8
import json
from django.core import serializers
from django.db import models, migrations


def forwards(apps, schema_editor):
    data = [
      {
        "model": "file_store.FileType",
        "pk": 1,
        "fields": {
          "description": "Binary compressed SAM",
          "name": "BAM",
          "used_for_visualization": True
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 2,
        "fields": {
          "description": "BED file",
          "name": "BED",
          "used_for_visualization": True
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 3,
        "fields": {
          "description": "Big BED",
          "name": "BIGBED"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 4,
        "fields": {
          "description": "Big WIG",
          "name": "BIGWIG",
          "used_for_visualization": True
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 5,
        "fields": {
          "description": "Circular Binary Segmentation File",
          "name": "CBS"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 6,
        "fields": {
          "description": "Affymetrix Probe Results File",
          "name": "CEL"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 7,
        "fields": {
          "description": "Comma Separated Values",
          "name": "CSV"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 8,
        "fields": {
          "description": "Eland file",
          "name": "ELAND"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 9,
        "fields": {
          "description": "GFF file",
          "name": "GFF",
          "used_for_visualization": True
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 10,
        "fields": {
          "description": "GTF file",
          "name": "GTF"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 11,
        "fields": {
          "description": "Gzip compressed archive",
          "name": "GZ"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 12,
        "fields": {
          "description": "Hypertext Markup Language",
          "name": "HTML"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 13,
        "fields": {
          "description": "IDF file",
          "name": "IDF"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 14,
        "fields": {
          "description": "FASTA file",
          "name": "FASTA"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 15,
        "fields": {
          "description": "FASTQ file",
          "name": "FASTQ"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 16,
        "fields": {
          "description": "FASTQC Sanger",
          "name": "FASTQCSANGER"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 17,
        "fields": {
          "description": "FASTQ Illumina",
          "name": "FASTQILLUMINA"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 18,
        "fields": {
          "description": "FASTQ Sanger",
          "name": "FASTQSANGER"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 19,
        "fields": {
          "description": "FASTQ Solexa",
          "name": "FASTQSOLEXA"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 20,
        "fields": {
          "description": "Portable Document Format",
          "name": "PDF"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 21,
        "fields": {
          "description": "Sequence Alignment/Map",
          "name": "SAM"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 22,
        "fields": {
          "description": "Segmented Data File",
          "name": "SEG",
          "used_for_visualization": True
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 23,
        "fields": {
          "description": "Tabular file",
          "name": "TABULAR"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 24,
        "fields": {
          "description": "TDF file",
          "name": "TDF",
          "used_for_visualization": True
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 25,
        "fields": {
          "description": "Gzip compressed tar archive",
          "name": "TGZ"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 26,
        "fields": {
          "description": "Text file",
          "name": "TXT"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 27,
        "fields": {
          "description": "Variant Call Format",
          "name": "VCF",
          "used_for_visualization": True
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 28,
        "fields": {
          "description": "Wiggle Track Format",
          "name": "WIG",
          "used_for_visualization": True
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 29,
        "fields": {
          "description": "XML file",
          "name": "XML"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 32,
        "fields": {
          "description": "Zip compressed archive",
          "name": "ZIP"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 34,
        "fields": {
          "description": "FASTQ.GZ file",
          "name": "FASTQ.GZ"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 35,
        "fields": {
          "description": "GCT file",
          "name": "GCT"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 37,
        "fields": {
          "description": "DAT file",
          "name": "DAT"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 38,
        "fields": {
          "description": "Illumina basecall file",
          "name": "BCL"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 39,
        "fields": {
          "description": "Illumina basecall file gzipped",
          "name": "BCL GZip file"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 40,
        "fields": {
          "description": "Illumina basecall file tarred + gzipped",
          "name": "BCL TGZ file"
        }
      },
      {
        "model": "file_store.FileType",
        "pk": 41,
        "fields": {
          "description": "BAM index file",
          "name": "BAI file",
          "used_for_visualization": True
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 1,
        "fields": {
          "name": "bam",
          "filetype": 1
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 2,
        "fields": {
          "name": "bed",
          "filetype": 2
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 3,
        "fields": {
          "name":"bigbed",
          "filetype": 3
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 4,
        "fields": {
          "name": "bigwig",
          "filetype": 4
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 5,
        "fields": {
          "name": "cbs",
          "filetype": 5
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 6,
        "fields": {
          "name": "cel",
          "filetype": 6
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 7,
        "fields": {
          "name": "csv",
          "filetype": 7
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 8,
        "fields": {
          "name": "eland",
          "filetype": 8
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 9,
        "fields": {
          "name": "gff",
          "filetype": 9
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 10,
        "fields": {
          "name": "gtf",
          "filetype": 10
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 11,
        "fields": {
          "name": "gz",
          "filetype": 11
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 12,
        "fields": {
          "name": "html",
          "filetype": 12
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 13,
        "fields": {
          "name": "idf",
          "filetype": 13
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 14,
        "fields": {
          "name": "fasta",
          "filetype": 14
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 15,
        "fields": {
          "name": "fastq",
          "filetype": 15
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 16,
        "fields": {
          "name": "fastqcsanger",
          "filetype": 16
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 17,
        "fields": {
          "name": "fastqillumina",
          "filetype": 17
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 18,
        "fields": {
          "name": "fastqsanger",
          "filetype": 18
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 19,
        "fields": {
          "name": "fastqsolexa",
          "filetype": 19
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 20,
        "fields": {
          "name": "pdf",
          "filetype": 20
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 21,
        "fields": {
          "name": "sam",
          "filetype": 21
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 22,
        "fields": {
          "name": "seg",
          "filetype": 22
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 23,
        "fields": {
          "name": "tabular",
          "filetype": 23
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 24,
        "fields": {
          "name": "tdf",
          "filetype": 24
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 25,
        "fields": {
          "name": "tgz",
          "filetype": 25
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 26,
        "fields": {
          "name": "txt",
          "filetype": 26
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 27,
        "fields": {
          "name": "vcf",
          "filetype": 27
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 28,
        "fields": {
          "name": "wig",
          "filetype": 28
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 29,
        "fields": {
          "name": "xml",
          "filetype": 29
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 30,
        "fields": {
          "name": "bb",
          "filetype": 3
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 31,
        "fields": {
          "name": "igv.tdf",
          "filetype": 24
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 32,
        "fields": {
          "name": "zip",
          "filetype": 32
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 34,
        "fields": {
          "name": "fastq.gz",
          "filetype": 34
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 35,
        "fields": {
          "name": "gct",
          "filetype": 35
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 38,
        "fields": {
          "name": "fq",
          "filetype": 15
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 39,
        "fields": {
          "name": "bcl",
          "filetype": 38
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 39,
        "fields": {
          "name": "bcl.gz",
          "filetype": 39
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 40,
        "fields": {
          "name": "bcl.tgz",
          "filetype": 40
        }
      },
      {
        "model": "file_store.FileExtension",
        "pk": 41,
        "fields": {
          "name": "bai",
          "filetype": 41
        }
      }
    ]
    data_as_json = json.dumps([ob for ob in data])
    objects = serializers.deserialize('json', data_as_json, ignorenonexistent=True)
    for obj in objects:
        obj.save()


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