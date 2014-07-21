'''
Created on May 11, 2012

@author: nils
'''

import os
import simplejson
from urlparse import urlparse
from django import forms
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect, HttpResponse, HttpResponseBadRequest
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.views.generic import View
from haystack.query import SearchQuerySet
from core.models import *
from data_set_manager.tasks import parse_isatab
from data_set_manager.utils import *
from file_store.tasks import download_file, DownloadError
from file_store.models import get_temp_dir


def index(request):
    return HttpResponse(
        simplejson.dumps(get_nodes(study_id=2, assay_id=2), indent=2),
        mimetype='application/json')


def nodes(request, type, study_uuid, assay_uuid=None ):
    start = datetime.now()
    matrix = get_matrix(study_uuid=study_uuid, assay_uuid=assay_uuid, node_type=type )
    end = datetime.now()
    print( "Time to retrieve node matrix: " + str(end - start))
    return HttpResponse(simplejson.dumps(matrix, indent=2),
                        mimetype='application/json')


def node_attributes(request, type, study_uuid, assay_uuid=None):
    attributes = get_node_attributes(study_uuid=study_uuid,
                                          assay_uuid=assay_uuid,
                                          node_type=type)
    return HttpResponse(simplejson.dumps(attributes, indent=2),
                        mimetype='application/json')


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
        search_value = request.POST.getlist('search')
        
        results = SearchQuerySet().autocomplete(content_auto=search_value[0])
        #results = SearchQuerySet().auto_query(search_value[0])
        
        ret_list = []
        for res in results:
            ret_list.append(res.name)
        return HttpResponse( simplejson.dumps( ret_list, indent=2 ), mimetype='application/json' )


#===============================================================================
# ISA-Tab import
#===============================================================================
class ImportISATabView(View):
    '''Capture ISA archive URL from POST requests submitted from external sites

    '''
    def post(self, request, *args, **kwargs):
        try:
            isa_tab_url = request.POST['isa_tab_url']
        except KeyError:
            logger.error("ISA archive URL was not provided")
            return HttpResponseBadRequest("Please provide an ISA archive URL")
        else:
            # set cookie and redirect to process_isa_tab view
            response = HttpResponseRedirect(reverse('process_isa_tab'))
            response.set_cookie('isa_tab_url', isa_tab_url)
            return response


class ImportISATabFileForm(forms.Form):
    '''ISA-Tab file upload form

    '''
    isa_tab_file = forms.FileField(label='ISA-Tab file', required=False)
    isa_tab_url = forms.URLField(label='ISA-Tab URL', required=False,
                                 widget=forms.TextInput(attrs={'size':'37'}))

    def clean(self):
        cleaned_data = super(ImportISATabFileForm, self).clean()
        f = cleaned_data.get("isa_tab_file")
        url = cleaned_data.get("isa_tab_url")
        # either a file or a URL must be provided
        if f or url:
            return cleaned_data
        else:
            raise forms.ValidationError("Please provide either a file or a URL")


class ProcessISATabView(View):
    '''Process ISA-Tab archive

    '''
    template_name = 'data_set_manager/import.html'
    success_view_name = 'data_set'
    isa_tab_cookie_name = 'isa_tab_url'

    # a workaround for automatic ISA archive import after logging in
    def get(self, request, *args, **kwargs):
        try:
            url_from_cookie = request.COOKIES[self.isa_tab_cookie_name]
        except KeyError:
            logger.info("ISA-Tab URL was not provided")
            form = ImportISATabFileForm()
            context = RequestContext(request, {'form': form})
            return render_to_response(self.template_name,
                                      context_instance=context)
        form = ImportISATabFileForm({'isa_tab_url': url_from_cookie})
        if form.is_valid():
            url = form.cleaned_data['isa_tab_url']
        else:
            context = RequestContext(request, {'form': form})
            response = render_to_response(self.template_name,
                                          context_instance=context)
            response.delete_cookie(self.isa_tab_cookie_name)
            return response
        u = urlparse(url)
        file_name = u.path.split('/')[-1]
        temp_file_path = os.path.join(get_temp_dir(), file_name)
        try:
            #TODO: refactor download_file to take file handle instead of path
            download_file(url, temp_file_path)
        except DownloadError as e:
            logger.error("Problem downloading ISA-Tab file. %s", e)
            error = "Problem downloading ISA-Tab file from: '{}'".format(url)
            context = RequestContext(request, {'form': form, 'error': error})
            response = render_to_response(self.template_name,
                                          context_instance=context)
            response.delete_cookie(self.isa_tab_cookie_name)
            return response
        logger.debug("Temp file name: '%s'", temp_file_path)
        dataset_uuid = parse_isatab.delay(request.user.username,
                                          False,
                                          temp_file_path).get()
        #TODO: exception handling
        os.unlink(temp_file_path)
        if dataset_uuid:
            #TODO: redirect to the list of analysis samples for the given UUID
            response = HttpResponseRedirect(
                reverse(self.success_view_name, args=(dataset_uuid,)))
            response.delete_cookie(self.isa_tab_cookie_name)
            return response
        else:
            error = "Problem parsing ISA-Tab file"
            context = RequestContext(request, {'form': form, 'error': error})
            response = render_to_response(self.template_name,
                                          context_instance=context)
            response.delete_cookie(self.isa_tab_cookie_name)
            return response

    def post(self, request, *args, **kwargs):
        form = ImportISATabFileForm(request.POST, request.FILES)
        if form.is_valid():
            f = form.cleaned_data['isa_tab_file']
            url = form.cleaned_data['isa_tab_url']
            logger.debug("ISA-Tab URL: %s", url)
            context = RequestContext(request, {'form': form})
            if url:
                #TODO: replace with chain
                #http://docs.celeryproject.org/en/latest/userguide/tasks.html#task-synchronous-subtasks
                u = urlparse(url)
                file_name = u.path.split('/')[-1]
                temp_file_path = os.path.join(get_temp_dir(), file_name)
                try:
                    #TODO: refactor download_file to take file handle instead of path
                    download_file(url, temp_file_path)
                except DownloadError as e:
                    logger.error("Problem downloading ISA-Tab file. %s", e)
                    error = "Problem downloading ISA-Tab file from: " + url
                    context = RequestContext(request, {'form': form, 'error': error})
                    return render_to_response(self.template_name,
                                              context_instance=context)
            else:
                temp_file_path = os.path.join(get_temp_dir(), f.name)
                try:
                    handle_uploaded_file(f, temp_file_path)
                except IOError as e:
                    error_msg = "Error writing ISA-Tab file to disk."
                    error_msg += " IOError: %s, file name: %s, error: %s"
                    logger.error(error_msg, e.errno, e.filename, e.strerror)
                    error = "Error writing ISA-Tab file to disk"
                    context = RequestContext(request,
                                             {'form': form, 'error': error})
                    return render_to_response(self.template_name,
                                              context_instance=context)
            logger.debug("Temp file name: '%s'", temp_file_path)
            dataset_uuid = parse_isatab.delay(request.user.username,
                                              False, temp_file_path).get()
            #TODO: exception handling
            os.unlink(temp_file_path)
            if dataset_uuid:
                #TODO: redirect to the list of analysis samples for the given UUID
                return HttpResponseRedirect(
                    reverse(self.success_view_name, args=(dataset_uuid,)))
            else:
                error = 'Problem parsing ISA-Tab file'
                context = RequestContext(request,
                                         {'form': form, 'error': error})
                return render_to_response(self.template_name,
                                          context_instance=context)
        else:   # submitted form is not valid
            context = RequestContext(request, {'form': form})
            return render_to_response(self.template_name,
                                      context_instance=context)


def handle_uploaded_file(source_file, target_path):
    '''Write contents of an uploaded file object to a file on disk
    Raises IOError

    :param source_file: uploaded file object
    :type source_file: file object
    :param target_path: absolute file system path to a temp file
    :type target_path: str

    '''
    with open(target_path, 'wb+') as destination:
        for chunk in source_file.chunks():
            destination.write(chunk)
