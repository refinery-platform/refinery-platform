'''
Created on Apr 21, 2012

@author: nils
'''
from django.shortcuts import render_to_response
from django.template.context import RequestContext

# Create your views here.
def index( request ):
    return render_to_response( 'file_server/index.html', context_instance=RequestContext( request ) )

def file( request ):
    return render_to_response( 'file_server/file.html', context_instance=RequestContext( request ) )
