# encoding: utf8
from django.db import migrations, transaction, IntegrityError


def forwards(apps, schema_editor):
    Filetype = apps.get_model("file_store", "Filetype")
    FileExtension = apps.get_model("file_store", "FileExtension")

    filetypes = [
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

    for filetype in filetypes:
        # Attempt to save FileType objects. If an IntegrityError is raised
        # upon saving an object we continue as it already exists.
        try:
            with transaction.atomic():
                filetype.save()
        except IntegrityError:
            continue

    file_extensions = [
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
            name="cool",
            filetype=Filetype.objects.get(name="COOLER")
        ),
        FileExtension(
            name="bedgraph",
            filetype=Filetype.objects.get(name="BEDGRAPH")
        )
    ]

    for file_extension in file_extensions:
        # Attempt to save FileExtension objects. If an IntegrityError is raised
        # upon saving an object we continue as it already exists.
        try:
            with transaction.atomic():
                file_extension.save()
        except IntegrityError:
            continue


def backwards(apps, schema_editor):
    Filetype = apps.get_model("file_store", "Filetype")
    FileExtension = apps.get_model("file_store", "FileExtension")
    Filetype.objects.filter(name__in=["COOLER", "HITILE", "BEDGRAPH"]).delete()
    FileExtension.objects.filter(name__in=[
        "bw", "hitile", "cool", "bedgraph"
    ]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('file_store', '0002_filetypes_and_fileextensions'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards)
    ]