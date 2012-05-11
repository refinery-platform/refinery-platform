'''
Created on May 11, 2012

@author: nils
'''

from django.contrib import admin
from data_set_manager.models import *


admin.site.register(Investigation)
admin.site.register(Study)
admin.site.register(Publication)
admin.site.register(Contact)
admin.site.register(OntologyDeclaration)
admin.site.register(Design)
admin.site.register(FactorDeclaration)
admin.site.register(AssayDeclaration)
admin.site.register(Protocol)
admin.site.register(ProtocolReference)
admin.site.register(ProtocolReferenceParameter)
admin.site.register(Node)
admin.site.register(Attribute)