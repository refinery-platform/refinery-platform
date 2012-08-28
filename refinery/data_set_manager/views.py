'''
Created on May 11, 2012

@author: nils
'''

import os
from urlparse import urlparse
from django import forms
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import Http404, HttpResponseRedirect, HttpResponse
from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext
from django.utils import simplejson
from haystack.query import SearchQuerySet
from core.models import *
from data_set_manager.tasks import parse_isatab
from data_set_manager.utils import *
from file_store.tasks import download_file


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
    
def contents(request, study_uuid, assay_uuid ):
    # getting current workflows
    workflows = Workflow.objects.all();
    
    return render_to_response('data_set_manager/contents.html', {
                               "study_uuid": study_uuid,
                               "assay_uuid": assay_uuid,
                               "workflows": workflows,
                               },
                              context_instance=RequestContext(request) )
    

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


@login_required
@csrf_exempt
def import_isa_tab(request):
    '''Process imported ISA-Tab file sent via POST request
    
    '''
    error = '' 
    if request.method == 'POST':
        form = ImportISATabFileForm(request.POST, request.FILES)
        if form.is_valid():
            f = form.cleaned_data['isa_tab_file']
            url = form.cleaned_data['isa_tab_url']

            # add ISA-Tab file to the file store
            if url:
                #TODO: replace with chain (http://docs.celeryproject.org/en/latest/userguide/tasks.html#task-synchronous-subtasks)
                temp_file_name = download_file.delay(url).get()
                if not temp_file_name:
                    error = 'Problem downloading file from: ' + url
                    context = RequestContext(request, {'form': form, 'error': error})
                    return render_to_response('data_set_manager/import.html', context_instance=context)
                # rename downloaded file to its original name
                u = urlparse(url)
                real_name = u.path.split('/')[-1]
                temp_dir = os.path.dirname(temp_file_name)
                new_temp_file_name = os.path.join(temp_dir, real_name)
                try:
                    os.rename(temp_file_name, new_temp_file_name)
                except OSError as e:
                    logger.error("Error renaming downloaded ISA-Tab file\nOSError: %s, file name: %s, error: %s",
                                 e.errno, e.filename, e.strerror)
                    #os.unlink(temp_file_name)
                    error = 'Problem renaming downloaded ISA-Tab file'
                    context = RequestContext(request, {'form': form, 'error': error})
                    return render_to_response('data_set_manager/import.html', context_instance=context)
                logger.debug("New temp file name: '%s'", new_temp_file_name)
                dataset_uuid = parse_isatab(request.user.username, True, new_temp_file_name)
                #os.unlink(new_temp_file_name)
            else:
                # rename uploaded file to its original name
                #FIXME: the system is trying to remove the uploaded file automatically
                #       and raises OSError exception if file is not found
                # solutions:
                # create a copy of the uploaded file and pass it to parse_isatab() 
                # modify parse_isatab() to accept a FileStoreItem or a UUID
                # modify parse_isatab() to accept new file name as an additional arg
#                temp_dir = os.path.dirname(f.temporary_file_path())
#                new_temp_file_name = os.path.join(temp_dir, f.name)
#                try:
#                    os.rename(f.temporary_file_path(), new_temp_file_name)
#                except OSError as e:
#                    logger.error("Error renaming uploaded ISA-Tab file\nOSError: %s, file name: %s, error: %s",
#                                 e.errno, e.filename, e.strerror)
#                    error = 'Problem renaming uploaded ISA-Tab file'
#                    context = RequestContext(request, {'form': form, 'error': error})
#                    return render_to_response('data_set_manager/import.html', context_instance=context)
                dataset_uuid = parse_isatab(request.user.username, False, f.temporary_file_path())

            if dataset_uuid:
                #TODO: redirect to the list of analysis samples for the given UUID
                return HttpResponseRedirect('/data_sets/' + dataset_uuid + '/')
            else:
                error = 'Problem parsing ISA-Tab file'
                context = RequestContext(request, {'form': form, 'error': error})
                return render_to_response('data_set_manager/import.html', context_instance=context)

        else:   # submitted form is not valid
            context = RequestContext(request, {'form': form, 'error': error})
    else:   # this was not a POST request
        form = ImportISATabFileForm()
        context = RequestContext(request, {'form': form})

    return render_to_response('data_set_manager/import.html', context_instance=context)
