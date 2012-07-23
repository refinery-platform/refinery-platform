'''
Created on May 11, 2012

@author: nils
'''

from data_set_manager.utils import *
from django.http import HttpResponse
from django.utils import simplejson
from haystack.query import SearchQuerySet
from file_store.tasks import create, import_file
from file_store.models import FileStoreItem
from django.contrib.auth.decorators import login_required
from django.http import Http404, HttpResponseRedirect, HttpResponse
from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext
from data_set_manager.tasks import process_isa_tab
from core.models import *
from django import forms

def index(request):
    return HttpResponse( simplejson.dumps( get_nodes(study_id=2, assay_id=2), indent=2 ), mimetype='application/json' )

def nodes(request, type, study_uuid, assay_uuid=None ):
    start = datetime.now()
    matrix = get_matrix(study_uuid=study_uuid, assay_uuid=assay_uuid, node_type=type )
    end = datetime.now()
    print( "Time to retrieve node matrix: " + str(end - start))
    return HttpResponse( simplejson.dumps( matrix, indent=2 ), mimetype='application/json' )

def node_attributes(request, type, study_uuid, assay_uuid=None ):
    return HttpResponse( simplejson.dumps( get_node_attributes( study_uuid=study_uuid, assay_uuid=assay_uuid, node_type=type ), indent=2 ), mimetype='application/json' )

def node_types(request, study_uuid, assay_uuid=None ):
    return HttpResponse( simplejson.dumps( get_node_types( study_uuid=study_uuid, assay_uuid=assay_uuid ), indent=2 ), mimetype='application/json' )

def node_types_files(request, study_uuid, assay_uuid=None ):
    return HttpResponse( simplejson.dumps( get_node_types( study_uuid=study_uuid, assay_uuid=assay_uuid, files_only=True, filter_set=Node.FILES ), indent=2 ), mimetype='application/json' )

def node_annotate(request, type, study_uuid, assay_uuid=None ):
    return HttpResponse( simplejson.dumps( update_annotated_nodes(study_uuid=study_uuid, assay_uuid=assay_uuid, node_type=type ), indent=2 ), mimetype='application/json' )
    #return HttpResponse( update_annotated_nodes(study_uuid=study_uuid, assay_uuid=assay_uuid, node_type=type ), mimetype='application/json' )

# ajax function for returning typeahead queries
def search_typeahead(request):
    
    if (request.is_ajax()):
        #print "RETURNING AJAX"
        
        search_value = request.POST.getlist('search')
        
        results = SearchQuerySet().autocomplete(content_auto=search_value[0])
        #results = SearchQuerySet().auto_query(search_value[0])
        
        ret_list = []
        for res in results:
            ret_list.append(res.name)
        return HttpResponse( simplejson.dumps( ret_list, indent=2 ), mimetype='application/json' )
    
    #else:
        #print "NOT AJAX"
        #return HttpResponse("not ajax")

#===============================================================================
# ISA-Tab import
#===============================================================================
class ImportISATabFileForm(forms.Form):
    ''' ISA-Tab file upload form '''
    isa_tab_file = forms.FileField(label='ISA-Tab file', required=False)
    isa_tab_url = forms.URLField(label='ISA-Tab URL', required=False, widget=forms.TextInput(attrs={'size':'37'}))

    def clean(self):
        cleaned_data = super(ImportISATabFileForm, self).clean()
        f = cleaned_data.get("isa_tab_file")
        url = cleaned_data.get("isa_tab_url")
        # either a file or a URL must be provided
        if f or url:
            return cleaned_data
        else:
            raise forms.ValidationError("Please provide either a file or a URL") 

@login_required()
def import_isa_tab(request):
    ''' Process imported ISA-Tab file sent via POST request '''
    error = '' 
    if request.method == 'POST':
        form = ImportISATabFileForm(request.POST, request.FILES)
        if form.is_valid():
            f = form.cleaned_data['isa_tab_file']
            url = form.cleaned_data['isa_tab_url']
            # add ISA-Tab file to the file store
            if url:
                result = create.delay(url)
                file_uuid = result.get()
                result = import_file.delay(file_uuid)
                item = result.get()
                if not item:
                    error = 'Problem downloading file from: ' + url
                    context = RequestContext(request, {'form': form, 'error': error})
                    return render_to_response('data_set_manager/import.html', context_instance=context)
            else:
                #FIXME: add file-like objects to the file store
                item = FileStoreItem(source=f.name)
                item.datafile.save(f.name, f)
            # parse ISA-Tab
            investigation_uuid = process_isa_tab(item.uuid)
            if investigation_uuid:
                #TODO create a dataset
                investigation = Investigation.objects.get(uuid=investigation_uuid)
                dataset = DataSet.objects.create(name=investigation.get_title())
                dataset.set_investigation(investigation)
                dataset.set_owner(request.user)
                #TODO: redirect to the list of analysis samples for the given UUID
                return HttpResponseRedirect('/data_sets/' + dataset.uuid + '/')
            else:
                error = 'Problem parsing ISA-Tab file: ' + item.datafile.name
                context = RequestContext(request, {'form': form, 'error': error})
                return render_to_response('data_set_manager/import.html', context_instance=context)
        else:   # submitted form is not valid
            context = RequestContext(request, {'form': form, 'error': error})
    else:   # this was not a POST request
        form = ImportISATabFileForm()
        context = RequestContext(request, {'form': form})

    return render_to_response('data_set_manager/import.html', context_instance=context)
