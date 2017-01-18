from django.contrib import admin

from .models import BAMItem, BigBEDItem, TDFItem, WIGItem

admin.site.register(TDFItem)
admin.site.register(BAMItem)
admin.site.register(WIGItem)
admin.site.register(BigBEDItem)
