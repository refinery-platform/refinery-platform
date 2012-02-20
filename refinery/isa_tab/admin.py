from django.contrib import admin
from isa_tab.models import Investigation, Investigator, Sub_Type, Raw_Data, Processed_Data, Assay, Characteristic, Factor_Value


class InvestigationAdmin(admin.ModelAdmin):
    pass


class InvestigatorAdmin(admin.ModelAdmin):
    pass


class Sub_TypeAdmin(admin.ModelAdmin):
    pass


class Raw_DataAdmin(admin.ModelAdmin):
    pass


class Processed_DataAdmin(admin.ModelAdmin):
    pass


class AssayAdmin(admin.ModelAdmin):
    pass


class CharacteristicAdmin(admin.ModelAdmin):
    pass


class Factor_ValueAdmin(admin.ModelAdmin):
    pass



admin.site.register(Investigation, InvestigationAdmin)
admin.site.register(Investigator, InvestigatorAdmin)
admin.site.register(Sub_Type, Sub_TypeAdmin)
admin.site.register(Raw_Data, Raw_DataAdmin)
admin.site.register(Processed_Data, Processed_DataAdmin)
admin.site.register(Assay, AssayAdmin)
admin.site.register(Characteristic, CharacteristicAdmin)
admin.site.register(Factor_Value, Factor_ValueAdmin)

