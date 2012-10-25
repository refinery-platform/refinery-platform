from django.contrib import admin
import file_server.models

admin.site.register(file_server.models.TDFItem)
admin.site.register(file_server.models.BAMItem)
admin.site.register(file_server.models.WIGItem)
