'''
Created on May 11, 2012

@author: nils
'''

import shutil
import simplejson as json
from urlparse import urlparse
from celery.result import AsyncResult
from chunked_upload.models import ChunkedUpload
from chunked_upload.views import ChunkedUploadView, ChunkedUploadCompleteView
from django import forms
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect, HttpResponse, \
    HttpResponseBadRequest
from django.shortcuts import render, render_to_response
from django.template import RequestContext
from django.views.generic import View
from django.views.generic.base import TemplateView
from haystack.query import SearchQuerySet
from core.models import *
from data_set_manager.single_file_column_parser import process_metadata_table
from data_set_manager.tasks import create_dataset, parse_isatab
from data_set_manager.utils import *
from file_store.tasks import download_file, DownloadError
from file_store.models import get_temp_dir, generate_file_source_translator


def index(request):
    return HttpResponse(
        simplejson.dumps(get_nodes(study_id=2, assay_id=2), indent=2),
        mimetype='application/json')


def nodes(request, type, study_uuid, assay_uuid=None):
    start = datetime.now()
    matrix = get_matrix(study_uuid=study_uuid, assay_uuid=assay_uuid,
                        node_type=type)
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


def node_types(request, study_uuid, assay_uuid=None):
    return HttpResponse(simplejson.dumps(
        get_node_types(study_uuid=study_uuid, assay_uuid=assay_uuid), indent=2),
                        mimetype='application/json')


def node_types_files(request, study_uuid, assay_uuid=None):
    return HttpResponse(simplejson.dumps(
        get_node_types(study_uuid=study_uuid, assay_uuid=assay_uuid,
                       files_only=True, filter_set=Node.FILES), indent=2),
                        mimetype='application/json')


def node_annotate(request, type, study_uuid, assay_uuid=None):
    return HttpResponse(simplejson.dumps(
        update_annotated_nodes(study_uuid=study_uuid, assay_uuid=assay_uuid,
                               node_type=type), indent=2),
                        mimetype='application/json')
    # return HttpResponse( update_annotated_nodes(study_uuid=study_uuid, assay_uuid=assay_uuid, node_type=type ), mimetype='application/json' )


def contents(request, study_uuid, assay_uuid):
    # getting current workflows
    workflows = Workflow.objects.all();

    return render_to_response('data_set_manager/contents.html', {
        "study_uuid": study_uuid,
        "assay_uuid": assay_uuid,
        "workflows": workflows,
    },
                              context_instance=RequestContext(request))


# ajax function for returning typeahead queries
def search_typeahead(request):
    if (request.is_ajax()):
        search_value = request.POST.getlist('search')

        results = SearchQuerySet().autocomplete(content_auto=search_value[0])
        # results = SearchQuerySet().auto_query(search_value[0])

        ret_list = []
        for res in results:
            ret_list.append(res.name)
        return HttpResponse(simplejson.dumps(ret_list, indent=2),
                            mimetype='application/json')


# ===============================================================================
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
                                 widget=forms.TextInput(attrs={'size': '37'}))

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
    template_name = 'data_set_manager/isa-tab-import.html'
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
        dataset_uuid, _ = parse_isatab.delay(request.user.username,
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
                    context = RequestContext(request,
                                             {'form': form, 'error': error})
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
            dataset_uuid, _ = parse_isatab.delay(request.user.username,
                                              False, temp_file_path).get()
            #TODO: exception handling (OSError)
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
        else:  # submitted form is not valid
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


class ProcessMetadataTableView(View):
    """Create a new dataset from uploaded metadata table.

    """
    template_name = 'data_set_manager/metadata-table-import.html'
    success_view_name = 'data_set'

    def get(self, request, *args, **kwargs):
        return render(request, self.template_name)

    def post(self, request, *args, **kwargs):
        # get required params
        try:
            metadata_file = request.FILES['file']
            title = request.POST['title']
            data_file_column = request.POST['data_file_column']
        except (KeyError, ValueError):
            error = {'error_message':
                     'Import failed because required parameters are missing'}
            return render(request, self.template_name, error)
        source_column_index = request.POST.getlist('source_column_index')
        if not source_column_index:
            error = {'error_message':
                     'Import failed because no source columns were selected'}
            return render(request, self.template_name, error)
        try:
            dataset_uuid = process_metadata_table(
                username=request.user.username, title=title,
                metadata_file=metadata_file, source_columns=source_column_index,
                data_file_column=data_file_column,
                auxiliary_file_column=request.POST.get('aux_file_column', None),
                base_path=request.POST.get('base_path', ""),
                data_file_permanent=request.POST.get('data_file_permanent',
                                                     False),
                species_column=request.POST.get('species_column', None),
                genome_build_column=request.POST.get('genome_build_column',
                                                     None),
                annotation_column=request.POST.get('annotation_column', None),
                slug=request.POST.get('slug', None),
                is_public=request.POST.get('is_public', False))
        except ValueError as exc:
            error = {'error_message': exc}
            return render(request, self.template_name, error)
        return HttpResponseRedirect(
            reverse(self.success_view_name, args=(dataset_uuid,)))


class CheckDataFilesView(View):
    """Check if given files exist, return list of files that don't exist

    """
    def post(self, request, *args, **kwargs):
        if not request.is_ajax() or not request.body:
            return HttpResponseBadRequest()

        file_data = json.loads(request.body)
        try:
            base_path = file_data["base_path"]
        except KeyError:
            base_path = ""

        bad_file_list = []
        translate_file_source = generate_file_source_translator(
            username=request.user.username, base_path=base_path)

        # check if files are available
        try:
            for file_path in file_data["list"]:
                file_path = translate_file_source(file_path)
                if not os.path.exists(file_path):
                    bad_file_list.append(file_path)
                logger.debug("File path checked: '%s'", file_path)
        except KeyError:  # if there's no list provided
            return HttpResponseBadRequest()

        # prefix output to protect from JSON vulnerability (stripped by Angular)
        return HttpResponse(")]}',\n" + json.dumps(bad_file_list),
                            content_type="application/json")


class FileUploadView(TemplateView):
    """Data file upload form view

    """
    template_name = 'data_set_manager/import.html'

    def get(self, request, *args, **kwargs):
        return render(request, self.template_name)


class ChunkedFileUploadView(ChunkedUploadView):

    model = ChunkedUpload
    field_name = "files[]"


class ChunkedFileUploadCompleteView(ChunkedUploadCompleteView):

    model = ChunkedUpload

    def on_completion(self, uploaded_file, request):
        # move file to the user's import directory
        logger.debug(request.POST.get('md5'))
        upload_id = request.POST.get('upload_id')
        chunked_upload = ChunkedUpload.objects.get(upload_id=upload_id)
        dst = os.path.join(get_user_import_dir(request.user),
                           chunked_upload.filename)
        try:
            shutil.move(chunked_upload.file.path, dst)
        except shutil.Error as e:
            logger.error(
                "Error moving uploaded file to user's import directory: %s", e)

    def get_response_data(self, chunked_upload, request):
        return {'message': 'You successfully uploaded this file'}
