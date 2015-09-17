import os
from django.contrib import admin
from file_store.models import FileStoreItem


class FileStoreItemAdmin(admin.ModelAdmin):
    readonly_fields = ('import_task_id',)

    def save_model(self, request, obj, form, change):
        '''Symlink if source is a local file

        '''
        if os.path.isabs(obj.source) and not obj.is_local():
            obj.symlink_datafile()

admin.site.register(FileStoreItem, FileStoreItemAdmin)
