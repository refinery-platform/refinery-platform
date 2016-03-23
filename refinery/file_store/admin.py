import os
from django.contrib import admin
from django.contrib import messages
from django.http import HttpResponseRedirect

from file_store.models import FileStoreItem, FileType, FileExtension


class FileStoreItemAdmin(admin.ModelAdmin):
    readonly_fields = ('import_task_id',)

    list_display = ['__unicode__', 'id', 'datafile', 'uuid', 'source',
                    'sharename', 'filetype', 'import_task_id', 'created',
                    'updated']

    def save_model(self, request, obj, form, change):
        '''Symlink if source is a local file

        '''
        if os.path.isabs(obj.source) and not obj.is_local():
            obj.symlink_datafile()


class FileTypeAdmin(admin.ModelAdmin):
    list_display = ['__unicode__', 'id', 'name', 'description']

    # Override Djangos queryset delete method and disallow the Unknown
    # Filetype from being deleted
    def delete_selected(self, request, objects):
        for instance in objects.all():
            if not instance.delete():
                messages.error(request, "Could not delete FileType:{} "
                                        "It has models dependant on it and "
                                        "needs to persist.".format(instance))
            else:
                instance.delete()
                messages.success(request, "FileType:{} deleted "
                                          "successfully!".format(instance))

    # Override Djangos deletion of a single object and disallow the Unknown
    # FileType from being deleted
    def delete_view(self, request, object_id, extra_context=None):
        obj = FileType.objects.get(pk=int(object_id))
        if not obj.delete():
            messages.error(request, "Could not delete FileType:{} "
                                    "It has models dependant on it and "
                                    "needs to persist.".format(obj))
            return HttpResponseRedirect('/admin/file_store/filetype/{'
                                        '}'.format(object_id))

    delete_selected.short_description = "Delete selected FileTypes"
    actions = [delete_selected]


class FileExtensionAdmin(admin.ModelAdmin):
    list_display = ['__unicode__', 'id', 'name', 'filetype']

    # Override Djangos queryset delete method and disallow the Unknown
    # FileExtension from being deleted
    def delete_selected(self, request, objects):
        for instance in objects.all():
            if not instance.delete():
                messages.error(request, "Could not delete FileExtension:{} "
                                        "It has models dependant on it and "
                                        "needs to persist.".format(instance))
            else:
                instance.delete()
                messages.success(request, "FileExtension:{} deleted "
                                          "successfully!".format(instance))

    # Override Djangos deletion of a single object and disallow the Unknown
    # FileExtension from being deleted
    def delete_view(self, request, object_id, extra_context=None):
        obj = FileExtension.objects.get(pk=int(object_id))
        if not obj.delete():
            messages.error(request, "Could not delete FileExtension:{} "
                                    "It has models dependant on it and "
                                    "needs to persist.".format(obj))
            return HttpResponseRedirect('/admin/file_store/fileextension/{'
                                        '}'.format(object_id))

    delete_selected.short_description = "Delete selected FileExtensions"
    actions = [delete_selected]


admin.site.register(FileStoreItem, FileStoreItemAdmin)
admin.site.register(FileType, FileTypeAdmin)
admin.site.register(FileExtension, FileExtensionAdmin)
