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
            description="Excel file",
            name="EXCEL",
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
            name="xls",
            filetype=FileType.objects.get(name="EXCEL")
        ),
        FileExtension(
            name="xlsx",
            filetype=FileType.objects.get(name="EXCEL")
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
    # Will cascade delete the two associated FileExtensions as well
    FileType.objects.get(name="EXCEL").delete()


class Migration(migrations.Migration):

    dependencies = [
        ('file_store', '0008_auto_20180226_1110'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards)
    ]