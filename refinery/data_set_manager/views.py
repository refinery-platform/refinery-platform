'''
Created on May 11, 2012

@author: nils
'''

import logging
import shutil
from urlparse import urlparse

from django import forms
from django.core.exceptions import MultipleObjectsReturned
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect, HttpResponse, \
    HttpResponseBadRequest
from django.shortcuts import render, render_to_response
from django.template import RequestContext
from django.views.generic import View

from chunked_upload.models import ChunkedUpload
from chunked_upload.views import ChunkedUploadView, ChunkedUploadCompleteView
from haystack.query import SearchQuerySet
import simplejson as json

from core.models import *
from data_set_manager.single_file_column_parser import process_metadata_table
from data_set_manager.tasks import create_dataset, parse_isatab
from data_set_manager.utils import *
from file_store.tasks import download_file, DownloadError
from file_store.models import get_temp_dir, generate_file_source_translator

logger = logging.getLogger(__name__)

# Data set import

class DataSetImportView(View):
    """Main view for data set importing"""
    template_name = "data_set_manager/import.html"
    success_view_name = 'data_set'
    isa_tab_cookie_name = 'isa_tab_url'

    def get(self, request, *args, **kwargs):
        form = ImportISATabFileForm()
        context = RequestContext(request, {'form': form})
        response = render_to_response(self.template_name,
                                      context_instance=context)
        return response


class ImportISATabView(View):
    """Capture ISA archive URL from POST requests submitted from external sites
    """
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
    """ISA archive upload form"""
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
            raise forms.ValidationError(
                "Please provide either a file or a URL")


class ProcessISATabView(View):
    """Process ISA archive"""
    template_name = 'data_set_manager/isa-tab-import.html'
    success_view_name = 'data_set'
    isa_tab_cookie_name = 'isa_tab_url'

    def get(self, request, *args, **kwargs):
        # a workaround for automatic ISA archive import after logging in
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
            # TODO: refactor download_file to take file handle instead of path
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
        dataset_uuid = parse_isatab.delay(request.user.username, False,
                                          temp_file_path).get()[0]
        # TODO: exception handling
        os.unlink(temp_file_path)
        if dataset_uuid:
            # TODO: redirect to the list of analysis samples for the given UUID
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
                # TODO: replace with chain
                # http://docs.celeryproject.org/en/latest/userguide/tasks.html#task-synchronous-subtasks
                u = urlparse(url)
                file_name = u.path.split('/')[-1]
                temp_file_path = os.path.join(get_temp_dir(), file_name)
                try:
                    # TODO: refactor download_file to take file handle instead
                    # of path
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
            dataset_uuid = (parse_isatab.delay(
                request.user.username,
                False,
                temp_file_path
            ).get())[0]
            # TODO: exception handling (OSError)
            os.unlink(temp_file_path)
            if dataset_uuid:
                # TODO: redirect to the list of analysis samples for the given
                # UUID
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
    """Write contents of an uploaded file object to a file on disk
    Raises IOError
    :param source_file: uploaded file object
    :type source_file: file object
    :param target_path: absolute file system path to a temp file
    :type target_path: str
    """
    with open(target_path, 'wb+') as destination:
        for chunk in source_file.chunks():
            destination.write(chunk)


class ProcessMetadataTableView(View):
    """Create a new dataset from uploaded metadata table"""
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
        # workaround for breaking change in Angular
        # https://github.com/angular/angular.js/commit/7fda214c4f65a6a06b25cf5d5aff013a364e9cef
        source_column_index = [column.replace("string:", "")
                               for column in source_column_index]
        try:
            dataset_uuid = process_metadata_table(
                username=request.user.username, title=title,
                metadata_file=metadata_file,
                source_columns=source_column_index,
                data_file_column=data_file_column,
                auxiliary_file_column=request.POST.get('aux_file_column',
                                                       None),
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
    """Check if given files exist, return list of files that don't exist"""
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
                if not isinstance(file_path, str):
                    bad_file_list.append(file_path)
                else:
                    file_path = translate_file_source(file_path)
                    if not os.path.exists(file_path):
                        bad_file_list.append(file_path)
                logger.debug("Checked file path: '%s'", file_path)
        except KeyError:  # if there's no list provided
            return HttpResponseBadRequest()
        # prefix output to protect from JSON vulnerability (stripped by
        # Angular)
        return HttpResponse(")]}',\n" + json.dumps(bad_file_list),
                            content_type="application/json")


class ChunkedFileUploadView(ChunkedUploadView):

    model = ChunkedUpload
    field_name = "files[]"


class ChunkedFileUploadCompleteView(ChunkedUploadCompleteView):

    model = ChunkedUpload

    def on_completion(self, uploaded_file, request):
        """Move file to the user's import directory"""
        try:
            upload_id = request.POST['upload_id']
        except KeyError:
            logger.error("Upload ID is missing from file upload request")
            return
        try:
            chunked_upload = ChunkedUpload.objects.get(upload_id=upload_id)
        except (ChunkedUpload.DoesNotExist, MultipleObjectsReturned) as exc:
            logger.error(
                "Error retrieving file upload instance with ID '%s': '%s'",
                upload_id, exc)
            return
        user_import_dir = get_user_import_dir(request.user)
        if not os.path.exists(user_import_dir):
            try:
                os.mkdir(user_import_dir)
            except OSError as exc:
                logger.error("Error creating user import directory '%s': %s",
                             user_import_dir, exc)
            else:
                logger.info("Created user import directory '%s'",
                            user_import_dir)
        dst = os.path.join(user_import_dir, chunked_upload.filename)
        try:
            shutil.move(chunked_upload.file.path, dst)
        except (shutil.Error, IOError) as exc:
            logger.error(
                "Error moving uploaded file to user's import directory: %s",
                exc)

    def get_response_data(self, chunked_upload, request):
        message = "You have successfully uploaded {}".format(
            chunked_upload.filename)
        return {"message": message}
