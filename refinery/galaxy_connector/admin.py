from django.contrib import admin

from galaxy_connector.models import Instance


class InstanceAdmin(admin.ModelAdmin):

    list_display = ['__str__', 'id', 'base_url', 'data_url', 'api_url',
                    'api_key', 'description']


admin.site.register(Instance, InstanceAdmin)
