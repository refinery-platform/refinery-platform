'''
Created on May 11, 2012

@author: nils
'''

import logging
import shutil
import urlparse
import json

from django import forms
from django.core.exceptions import MultipleObjectsReturned
from django.core.urlresolvers import reverse
from django.http import (HttpResponseRedirect, HttpResponse,
                         HttpResponseBadRequest)
from django.shortcuts import render, render_to_response
from django.template import RequestContext
from django.views.generic import View

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import Http404

from chunked_upload.models import ChunkedUpload
from chunked_upload.views import ChunkedUploadView, ChunkedUploadCompleteView

from core.models import os, get_user_import_dir, DataSet
from core.utils import get_full_url
from .single_file_column_parser import process_metadata_table
from .tasks import parse_isatab
from file_store.tasks import download_file, DownloadError
from file_store.models import get_temp_dir, generate_file_source_translator
from .models import AttributeOrder, Assay
from .serializers import AttributeOrderSerializer, AssaySerializer
from .utils import (generate_solr_params, search_solr, format_solr_response,
                    get_owner_from_assay, update_attribute_order_ranks,
                    is_field_in_hidden_list, customize_attribute_response)

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


class TakeOwnershipOfPublicDatasetView(View):
    """Capture relative ISA archive URL from POST requests submitted from
    external sites and formulates full url to
    """

    def post(self, request, *args, **kwargs):

        from_old_template = False

        if 'isa_tab_url' in request.POST:
            full_isa_tab_url = get_full_url(request.POST['isa_tab_url'])
            from_old_template = True
        else:
            request_body = request.body
            if not request_body:
                err_msg = "Neither form data nor a request body has been sent."
                logger.error(err_msg)
                return HttpResponseBadRequest(err_msg)

            try:
                body = json.loads(request_body)
            except Exception as e:
                err_msg = "Request body is no valid JSON"
                logger.error("%s: %s" % (err_msg, e))
                return HttpResponseBadRequest("%s." % err_msg)

            if "data_set_uuid" in body:
                data_set_uuid = body["data_set_uuid"]
            else:
                err_msg = "Request body doesn't contain data_set_uuid."
                logger.error(err_msg)
                return HttpResponseBadRequest(err_msg)

            try:
                full_isa_tab_url = get_full_url(DataSet.objects.get(
                    uuid=data_set_uuid).get_isa_archive().get_datafile_url())
            except (DataSet.DoesNotExist, DataSet.MultipleObjectsReturned,
                    Exception) as e:
                err_msg = "Something went wrong"
                logger.error("%s: %s" % (err_msg, e))
                return HttpResponseBadRequest("%s." % err_msg)

        if from_old_template:
            # Redirect to process_isa_tab view
            response = HttpResponseRedirect(
                reverse('process_isa_tab')
            )
        else:
            # Redirect to process_isa_tab view with arg 'ajax' if request is
            #  not coming from old Django Template
            response = HttpResponseRedirect(
                reverse('process_isa_tab', args=['ajax'])
            )

        # set cookie
        response.set_cookie('isa_tab_url', full_isa_tab_url)

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
        u = urlparse.urlparse(url)
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
            if 'ajax' in kwargs and kwargs['ajax']:
                return HttpResponse(
                    json.dumps({'new_data_set_uuid': dataset_uuid}),
                    'application/json'
                )
            else:
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
                u = urlparse.urlparse(url)
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
            error = {
                'error_message':
                    'Import failed because required parameters are missing'}
            return render(request, self.template_name, error)
        source_column_index = request.POST.getlist('source_column_index')
        if not source_column_index:
            error = {
                'error_message':
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


class Assays(APIView):
    """
    Return assay object

    ---
    #YAML

    GET:
        serializer: AssaySerializer
        omit_serializer: false

        parameters:
            - name: uuid
              description: Assay uuid
              type: string
              paramType: path
              required: true

    ...
    """

    def get_object(self, uuid):
        try:
            return Assay.objects.get(uuid=uuid)
        except Assay.DoesNotExist:
            raise Http404

    def get(self, request, uuid, format=None):
        assay = self.get_object(uuid)
        serializer = AssaySerializer(assay)
        return Response(serializer.data)


class AssaysFiles(APIView):

    """
    Return solr response. Query requires assay_uuid.

    ---
    #YAML

    GET:
        parameters_strategy:
            form: replace
            query: merge

        parameters:
            - name: uuid
              description: Assay uuid
              type: string
              required: true
              paramType: path
            - name: is_annotation
              description: Metadata
              type: boolean
              paramType: query
            - name: filter_attribute
              description: Filters for attributes fields
              type: string
              paramType: query
            - name: include_facet_count
              description: Enables facet counts in query response
              type: boolean
              paramType: query
            - name: offset
              description: Paginate offset response
              type: integer
              paramType: query
            - name: limit
              description: Maximum number of documents returned
              type: integer
              paramType: query
            - name: attributes
              description: Set of attributes to return separated by a comma
              type: string
              paramType: query
            - name: facets
              description: Specify facet fields separated by a comma
              type: string
              paramType: query
            - name: pivots
              description: List of fields to pivot separated by a comma
              type: string
              paramType: query
            - name: sort
              description: Order node response with field name asc/desc
              type: string
              paramType: query
    ...
    """

    def get(self, request, uuid, format=None):

        params = request.query_params

        solr_params = generate_solr_params(params, uuid)
        solr_response = search_solr(solr_params, 'data_set_manager')
        solr_response_json = format_solr_response(solr_response)

        return Response(solr_response_json)


class AssaysAttributes(APIView):
    """
    AttributeOrder Resource.
    Returns/Updates AttributeOrder model queries. Requires assay_uuid.
    The model is dynamically created, so users will not create new
    attribute_orders.

    Updates attribute_model

    ---
    #YAML

    GET:
        serializer: AttributeOrderSerializer
        omit_serializer: false

        parameters:
            - name: uuid
              description: Assay uuid
              type: string
              paramType: path
              required: true

    PUT:
        parameters_strategy:
        form: replace
        query: merge

        parameters:
            - name: uuid
              description: Assay uuid used as an identifier
              type: string
              paramType: path
              required: true
            - name: solr_field
              description: Title of solr field used as an identifier
              type: string
              paramType: form
              required: false
            - name: rank
              description: Position of the attribute in facet list and table
              type: int
              paramType: form
              required: false
            - name: is_exposed
              description: Show to non-owner users
              type: boolean
              paramType: form
            - name: is_facet
              description: Attribute used as facet
              type: boolean
              paramType: form
            - name: is_active
              description: Shown in table by default
              type: boolean
              paramType: form
            - name: id
              description: Attribute ID used as an identifier
              type: integer
              paramType: form
    ...
    """

    def get_objects(self, uuid):
        attributes = AttributeOrder.objects.filter(assay__uuid=uuid)
        if len(attributes):
            return attributes
        else:
            raise Http404

    def get(self, request, uuid, format=None):
        attribute_order = self.get_objects(uuid)
        serializer = AttributeOrderSerializer(attribute_order, many=True)
        owner = get_owner_from_assay(uuid)
        request_user = request.user

        # add a display name to the attribute object
        if owner == request_user:
            attributes = serializer.data
        # for non-owners, hide non-exposed attributes
        else:
            attributes = []
            for attribute in serializer.data:
                if attribute.get('is_exposed'):
                    attributes.append(attribute)

        # Reverse check, so can remove objects from the end
        for ind in range(len(attributes) - 1, -1, -1):
            if is_field_in_hidden_list(attributes[ind].get('solr_field')):
                del attributes[ind]
            else:
                attributes[ind]['display_name'] = customize_attribute_response(
                    [attributes[ind].get('solr_field')])[0].get(
                    'display_name')

        # for non-owners need to reorder the ranks
        if owner != request_user:
            for ind in range(0, len(attributes)):
                attributes[ind]['rank'] = ind + 1

        return Response(attributes)

    def put(self, request, uuid, format=None):
        owner = get_owner_from_assay(uuid)
        request_user = request.user

        if owner == request_user:
            solr_field = request.data.get('solr_field', None)
            id = request.data.get('id', None)
            new_rank = request.data.get('rank', None)

            if id:
                attribute_order = AttributeOrder.objects.get(
                    assay__uuid=uuid, id=id)
            elif solr_field:
                attribute_order = AttributeOrder.objects.get(
                    assay__uuid=uuid, solr_field=solr_field)
            else:
                return Response(
                    'Requires attribute id or solr_field name.',
                    status=status.HTTP_400_BAD_REQUEST)

            # updates all ranks in assay's attribute order
            if new_rank and new_rank != attribute_order.rank:
                try:
                    update_attribute_order_ranks(attribute_order, new_rank)
                except Exception as e:
                    return e

            serializer = AttributeOrderSerializer(attribute_order,
                                                  data=request.data,
                                                  partial=True)
            if serializer.is_valid():
                serializer.save()
                attributes = serializer.data
                attributes['display_name'] = customize_attribute_response(
                    [attributes.get('solr_field')])[0].get(
                    'display_name')

                return Response(
                    attributes,
                    status=status.HTTP_202_ACCEPTED
                )
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        else:
            message = 'Only owner may edit attribute order.'
            return Response(message, status=status.HTTP_401_UNAUTHORIZED)
