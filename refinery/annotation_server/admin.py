'''
Created on March 15, 2013

@author: nils
'''

from django.contrib import admin

from .models import GenomeBuild, Taxon

admin.site.register(Taxon)
admin.site.register(GenomeBuild)
