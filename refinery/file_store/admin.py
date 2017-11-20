import os

from django.contrib import admin

from .models import FileExtension, FileStoreItem, FileType


class FileStoreItemAdmin(admin.ModelAdmin):
    readonly_fields = ('import_task_id',)

    list_display = ['id', 'datafile', 'uuid', 'source', 'sharename',
                    'filetype', 'import_task_id', 'created', 'updated']

    def save_model(self, request, obj, form, change):
        """Symlink if source is a local file"""
        if os.path.isabs(obj.source) and not obj.is_local():
            obj.symlink_datafile()
        super(FileStoreItemAdmin, self).save_model(request, obj, form, change)


class FileTypeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'description', 'used_for_visualization']


class FileExtensionAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'filetype']


admin.site.register(FileStoreItem, FileStoreItemAdmin)
admin.site.register(FileType, FileTypeAdmin)
admin.site.register(FileExtension, FileExtensionAdmin)
