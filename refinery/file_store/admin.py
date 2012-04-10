'''
Created on Apr 10, 2012

@author: isytchev
'''
from django.contrib import admin
from refinery.file_store.models import RepositoryFile

admin.site.register(RepositoryFile)
