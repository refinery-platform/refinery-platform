'''
Created on March 15, 2013

@author: nils
'''

from django.contrib import admin
from annotation_server import models

admin.site.register(models.Taxon)
admin.site.register(models.GenomeBuild)
