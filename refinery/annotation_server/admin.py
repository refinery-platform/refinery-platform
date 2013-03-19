'''
Created on March 15, 2013

@author: nils
'''

from django.contrib import admin
from annotation_server.models import *

admin.site.register(Taxon)
admin.site.register(GenomeBuild)