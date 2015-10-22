import os
from django.contrib import admin
from file_store.models import FileStoreItem, FileType


class FileStoreItemAdmin(admin.ModelAdmin):
    readonly_fields = ('import_task_id',)

    list_display = ['__unicode__', 'id', 'datafile', 'uuid', 'source',
                    'sharename', 'filetype', 'import_task_id']

    def save_model(self, request, obj, form, change):
        '''Symlink if source is a local file

        '''
        if os.path.isabs(obj.source) and not obj.is_local():
            obj.symlink_datafile()


class FileTypeAdmin(admin.ModelAdmin):

    list_display = ['__unicode__', 'id', 'name', 'description', 'extension']

admin.site.register(FileStoreItem, FileStoreItemAdmin)
admin.site.register(FileType, FileTypeAdmin)
