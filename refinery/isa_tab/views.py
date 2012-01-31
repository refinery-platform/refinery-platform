# Create your views here.
from django.views.generic import View
from django.shortcuts import render_to_response, get_object_or_404, get_list_or_404
from django.http import Http404
from isa_tab.models import *

#displays Investigation accession, title, and description
def index(request):
    investigation_list = Investigation.objects.all()
    return render_to_response('isa_tab/index.html', 
                              {'investigation_list': investigation_list})

#displays all parsed ISA-Tab information
def detail(request, accession):
    i = get_object_or_404(Investigation, pk=accession)
    a = get_list_or_404(Assay, investigation=i)

    return render_to_response('isa_tab/detail.html', 
                              {
                               'investigation': i,
                               'assay': a
                               })