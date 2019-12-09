# -*- coding: utf-8 -*-


from django.db import migrations, models


def migrate_m2m_to_fk(apps, schema_editor):
    Analysis = apps.get_model('core', 'Analysis')
    for analysis in Analysis.objects.all():
        analysis.results.all().update(_analysis=analysis)
    # clean up orphan analysis result instances and related objects
    AnalysisResult = apps.get_model('core', 'AnalysisResult')
    FileStoreItem = apps.get_model('file_store', 'FileStoreItem')
    orphan_results = AnalysisResult.objects.filter(_analysis__isnull=True)
    FileStoreItem.objects.filter(uuid__in=orphan_results.values_list('file_store_uuid', flat=True)).delete()
    orphan_results.delete()


def migrate_fk_to_m2m(apps, schema_editor):
    AnalysisResult = apps.get_model('core', 'AnalysisResult')
    for result in AnalysisResult.objects.all():
        result._analysis.results.add(result)
        result.analysis_uuid = result._analysis.uuid
        result.save()


class Migration(migrations.Migration):
    """Data migration runs separately from schema changes to avoid
    OperationalError: cannot ALTER TABLE "core_analysisresult" because it has pending trigger events
    https://docs.djangoproject.com/en/1.8/ref/migration-operations/#runpython
    """

    dependencies = [
        ('core', '0035_update_analysisresult_analysis_uuid'),
        # include the latest migration of the file_store app to avoid
        # ProgrammingError: column file_store_filestoreitem.sharename does not exist
        # https://docs.djangoproject.com/en/1.8/topics/migrations/#accessing-models-from-other-apps
        ('file_store', '0009_xls_filetypes_and_fileextensions'),
    ]

    operations = [
        migrations.RunPython(migrate_m2m_to_fk, migrate_fk_to_m2m),
    ]
