'''
Created on May 11, 2012

@author: nils
'''

import json
import logging
import os
import shutil
import traceback
import urlparse

from django import forms
from django.conf import settings
from django.core.urlresolvers import reverse
from django.http import (
    Http404, HttpResponse, HttpResponseBadRequest, HttpResponseForbidden,
    HttpResponseRedirect, HttpResponseServerError, JsonResponse
)
from django.shortcuts import get_object_or_404, render, render_to_response
from django.template import RequestContext
from django.views.generic import View

import boto3
from chunked_upload.models import ChunkedUpload
from chunked_upload.views import ChunkedUploadCompleteView, ChunkedUploadView
from guardian.shortcuts import get_perms
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import DataSet, ExtendedGroup, get_user_import_dir
from core.utils import get_absolute_url
from data_set_manager.isa_tab_parser import ParserException
from file_store.models import (
    generate_file_source_translator, get_temp_dir, parse_s3_url
)
from file_store.tasks import download_file, import_file

from .models import Assay, AttributeOrder, Study
from .serializers import AssaySerializer, AttributeOrderSerializer
from .single_file_column_parser import process_metadata_table
from .tasks import parse_isatab
from .utils import (
    customize_attribute_response, format_solr_response,
    generate_solr_params_for_assay, get_owner_from_assay,
    initialize_attribute_order_ranks, is_field_in_hidden_list, search_solr,
    update_attribute_order_ranks
)

logger = logging.getLogger(__name__)


# Data set import
PARSER_ERROR_MESSAGE = "Improperly structured ISA-Tab file: "
PARSER_UNEXPECTED_ERROR_MESSAGE = "ISA-Tab import Failure: "


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

        try:
            request_body = request.body
        except Exception as e:
            err_msg = "Request body is no valid JSON"
            logger.error("%s: %s" % (err_msg, e))
            return HttpResponseBadRequest("%s." % err_msg)

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
            data_set = DataSet.objects.get(uuid=data_set_uuid)
        except (DataSet.DoesNotExist, DataSet.MultipleObjectsReturned,
                Exception) as exc:
            err_msg = "Something went wrong"
            logger.error("%s: %s" % (err_msg, exc))
            return HttpResponseBadRequest("%s." % err_msg)

        public_group = ExtendedGroup.objects.public_group()
        if request.user.has_perm('core.read_dataset', data_set) \
                or 'read_dataset' in get_perms(public_group, data_set):
            full_isa_tab_url = get_absolute_url(
                data_set.get_metadata_as_file_store_item().get_datafile_url()
            )
            response = HttpResponseRedirect(
                get_absolute_url(reverse('process_isa_tab', args=['ajax']))
            )
            # set cookie
            response.set_cookie('isa_tab_url', full_isa_tab_url)
            return response

        return HttpResponseForbidden("User is not authorized to access"
                                     "data set {}".format(data_set_uuid))


class ImportISATabFileForm(forms.Form):
    """ISA archive upload form"""
    isa_tab_file = forms.FileField(label='ISA-Tab file', required=False)
    isa_tab_url = forms.URLField(label='ISA-Tab URL', required=False,
                                 widget=forms.TextInput(attrs={'size': '37'}))

    def clean(self):
        cleaned_data = super(ImportISATabFileForm, self).clean()
        f = cleaned_data.get("isa_tab_file")
        url = cleaned_data.get("isa_tab_url")
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
        except RuntimeError as exc:
            logger.error("Problem downloading ISA-Tab file. %s", exc)
            error = "Problem downloading ISA-Tab file from: '{}'".format(url)
            context = RequestContext(request, {'form': form, 'error': error})
            response = render_to_response(self.template_name,
                                          context_instance=context)
            response.delete_cookie(self.isa_tab_cookie_name)
            return response
        logger.debug("Temp file name: '%s'", temp_file_path)
        try:
            dataset_uuid = parse_isatab(
                request.user.username,
                False,
                temp_file_path
            )
        except ParserException as e:
            error_message = "{} {}".format(
                PARSER_ERROR_MESSAGE,
                e.message
            )
            logger.error(error_message)
            return HttpResponseBadRequest(error_message)
        except Exception as e:
            error_message = "{} {}".format(
                PARSER_UNEXPECTED_ERROR_MESSAGE,
                traceback.format_exc(e)
            )
            logger.error(error_message)
            return HttpResponseBadRequest(
                PARSER_UNEXPECTED_ERROR_MESSAGE +
                e.message
            )

        # TODO: exception handling
        os.unlink(temp_file_path)
        if dataset_uuid:
            if 'ajax' in kwargs and kwargs['ajax']:
                return JsonResponse({'new_data_set_uuid': dataset_uuid})
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

        if form.is_valid() or request.is_ajax():
            try:
                f = form.cleaned_data['isa_tab_file']
            except KeyError:
                f = None

            try:
                url = form.cleaned_data['isa_tab_url']
            except KeyError:
                url = None

            if url:
                response = self.import_by_url(url)
            else:
                try:
                    response = self.import_by_file(f)
                except Exception as e:
                    logger.error(traceback.format_exc(e))
                    return HttpResponseBadRequest(
                       "{} {}".format(
                        PARSER_UNEXPECTED_ERROR_MESSAGE, e)
                    )

            # get AWS Cognito identity ID
            if settings.REFINERY_DEPLOYMENT_PLATFORM == 'aws':
                try:
                    identity_id = request.POST.get('identity_id')
                except (KeyError, ValueError):
                    error_msg = 'identity_id is missing'
                    error = {'error_message': error_msg}
                    if request.is_ajax():
                        return HttpResponseBadRequest(
                            json.dumps({'error': error_msg}),
                            'application/json'
                        )
                    else:
                        return render(request, self.template_name, error)
            else:
                identity_id = None

            if not response['success']:
                if request.is_ajax():
                    return HttpResponseBadRequest(
                        json.dumps({'error': response["message"]}),
                        content_type='application/json'
                    )
                return render_to_response(
                    self.template_name,
                    context_instance=RequestContext(
                        request,
                        {
                            'form': form,
                            'error': response["message"]
                        }
                    )
                )

            logger.debug(
                "Temp file name: '%s'", response['data']['temp_file_path']
            )

            try:
                parse_isatab_invocation = parse_isatab(
                    request.user.username,
                    False,
                    response['data']['temp_file_path'],
                    identity_id=identity_id
                )
            except ParserException as e:
                error_message = "{} {}".format(
                    PARSER_ERROR_MESSAGE,
                    e.message
                )
                logger.error(error_message)
                return HttpResponseBadRequest(error_message)
            except Exception as e:
                error_message = "{} {}".format(
                    PARSER_UNEXPECTED_ERROR_MESSAGE,
                    traceback.format_exc(e)
                )
                logger.error(error_message)
                return HttpResponseBadRequest(
                    "{} {}".format(PARSER_UNEXPECTED_ERROR_MESSAGE, e)
                )
            else:
                dataset_uuid = parse_isatab_invocation

            # import data files
            if dataset_uuid:
                try:
                    dataset = DataSet.objects.get(uuid=dataset_uuid)
                except (DataSet.DoesNotExist, DataSet.MultipleObjectsReturned):
                    logger.error(
                        "Cannot import data files for data set UUID '%s'",
                        dataset_uuid
                    )
                else:
                    # start importing uploaded data files
                    for file_store_item in dataset.get_file_store_items():
                        if file_store_item.source.startswith(
                            (settings.REFINERY_DATA_IMPORT_DIR, 's3://')
                        ):
                            import_file.delay(file_store_item.uuid)

                if request.is_ajax():
                    return JsonResponse({
                        'success': 'Data set imported',
                        'data': {'new_data_set_uuid': dataset_uuid}
                    })
                return HttpResponseRedirect(
                    reverse(self.success_view_name, args=[dataset_uuid])
                )
            else:
                error = 'Problem parsing ISA-Tab file'
                if request.is_ajax():
                    return JsonResponse({'error': error})
                context = RequestContext(request, {'form': form,
                                                   'error': error})
                return render_to_response(self.template_name,
                                          context_instance=context)
        else:  # submitted form is not valid
            context = RequestContext(request, {'form': form})
            return render_to_response(self.template_name,
                                      context_instance=context)

    def import_by_file(self, file):
        temp_file_path = os.path.join(get_temp_dir(), file.name)
        try:
            handle_uploaded_file(file, temp_file_path)
        except IOError as e:
            error_msg = "Error writing ISA-Tab file to disk"
            logger.error(
                "%s. IOError: %s, file name: %s, error: %s.",
                error_msg,
                e.errno,
                e.filename,
                e.strerror
            )
            return {
                "success": False,
                "message": error_msg
            }

        return {
            "success": True,
            "message": "File imported.",
            "data": {
                "temp_file_path": temp_file_path
            }
        }

    def import_by_url(self, url):
        # TODO: replace with chain
        # http://docs.celeryproject.org/en/latest/userguide/tasks.html#task-synchronous-subtasks
        parsed_url = urlparse.urlparse(url)
        file_name = parsed_url.path.split('/')[-1]
        temp_file_path = os.path.join(get_temp_dir(), file_name)
        try:
            # TODO: refactor download_file to take file handle instead
            # of path
            download_file(url, temp_file_path)
        except RuntimeError as exc:
            error_msg = "Problem downloading ISA-Tab file from: " + url
            logger.error("%s. %s", error_msg, exc)
            return {
                "success": False,
                "message": error_msg
            }

        return {
            "success": True,
            "message": "File imported.",
            "data": {
                "temp_file_path": temp_file_path
            }
        }


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
        # Get required params
        try:
            metadata_file = request.FILES['file']
            title = request.POST.get('title')
            data_file_column = request.POST.get('data_file_column')
        except (KeyError, ValueError):
            error_msg = 'Required parameters are missing'
            error = {'error_message': error_msg}
            if request.is_ajax():
                return HttpResponseBadRequest(
                    json.dumps({'error': error_msg}), 'application/json'
                )
            else:
                return render(request, self.template_name, error)

        try:
            source_column_index = request.POST.getlist('source_column_index')
        except TypeError as error_msg:
            error = {'error_message': error_msg}
            if request.is_ajax():
                return HttpResponseBadRequest(
                    # TODO: make sure error_msg is JSON serializable, e.g.:
                    # TypeError: IndexError('list index out of range',)
                    # is not JSON serializable
                    json.dumps({'error': error_msg}), 'application/json'
                )
            else:
                return render(request, self.template_name, error)
        else:
            if not source_column_index:
                error_msg = 'Source columns have not been selected'
                error = {'error_message': error_msg}
                if request.is_ajax():
                    return HttpResponseBadRequest(
                        json.dumps({'error': error_msg}), 'application/json'
                    )
                else:
                    return render(request, self.template_name, error)

        # workaround for breaking change in Angular
        # https://github.com/angular/angular.js/commit/7fda214c4f65a6a06b25cf5d5aff013a364e9cef
        source_column_index = [
            column.replace('string:', '') for column in source_column_index
        ]

        if settings.REFINERY_DEPLOYMENT_PLATFORM == 'aws':
            try:
                identity_id = request.POST.get('identity_id')
            except (KeyError, ValueError):
                error_msg = 'identity_id is missing'
                error = {'error_message': error_msg}
                if request.is_ajax():
                    return HttpResponseBadRequest(
                        json.dumps({'error': error_msg}), 'application/json'
                    )
                else:
                    return render(request, self.template_name, error)
        else:
            identity_id = None

        try:
            dataset_uuid = process_metadata_table(
                username=request.user.username,
                title=title,
                metadata_file=metadata_file,
                source_columns=source_column_index,
                data_file_column=data_file_column,
                auxiliary_file_column=request.POST.get('aux_file_column'),
                base_path=request.POST.get('base_path', ''),
                data_file_permanent=request.POST.get(
                    'data_file_permanent', False
                ),
                species_column=request.POST.get('species_column'),
                genome_build_column=request.POST.get('genome_build_column'),
                annotation_column=request.POST.get('annotation_column'),
                is_public=request.POST.get('is_public', False),
                delimiter=request.POST.get('delimiter'),
                custom_delimiter_string=request.POST.get(
                    'custom_delimiter_string', False
                ),
                identity_id=identity_id
            )
        except Exception as exc:
            logger.error(exc, exc_info=True)
            error = {'error_message': repr(exc)}
            if request.is_ajax():
                return HttpResponseServerError(
                    json.dumps({'error': repr(exc)}), 'application/json'
                )
            else:
                return render(request, self.template_name, error)

        if request.is_ajax():
            return JsonResponse({'new_data_set_uuid': dataset_uuid})
        else:
            return HttpResponseRedirect(
                reverse(self.success_view_name, args=(dataset_uuid,))
            )


class CheckDataFilesView(View):
    """Check if given files exist, return list of files that don't exist"""
    def post(self, request, *args, **kwargs):
        if not request.is_ajax() or not request.body:
            return HttpResponseBadRequest()

        try:
            file_data = json.loads(request.body)
        except ValueError:
            return HttpResponseBadRequest()
        try:
            input_file_list = file_data['list']
        except KeyError:
            return HttpResponseBadRequest()

        try:
            base_path = file_data['base_path']
        except KeyError:
            base_path = None
        try:
            identity_id = file_data['identity_id']
        except KeyError:
            identity_id = None

        bad_file_list = []
        translate_file_source = generate_file_source_translator(
            username=request.user.username, base_path=base_path,
            identity_id=identity_id
        )

        uploaded_s3_key_list = []
        if settings.REFINERY_DEPLOYMENT_PLATFORM == 'aws':
            # get a list of all uploaded S3 objects for the user
            s3 = boto3.resource('s3')
            s3_bucket = s3.Bucket(settings.UPLOAD_BUCKET)
            # TODO: handle ParamValidationError (return error msg in response?)
            for s3_object in s3_bucket.objects.filter(Prefix=identity_id):
                uploaded_s3_key_list.append(s3_object.key)

        for input_file_path in input_file_list:
            if not isinstance(input_file_path, unicode):
                bad_file_list.append(input_file_path)
                logger.error("Uploaded file path '%s' is not a string",
                             input_file_path)
            else:
                input_file_path = translate_file_source(input_file_path)
                if settings.REFINERY_DEPLOYMENT_PLATFORM == 'aws':
                    # check if S3 object key exists
                    bucket_name, key = parse_s3_url(input_file_path)
                    if key not in uploaded_s3_key_list:
                        bad_file_list.append(os.path.basename(key))
                        logger.debug("Object key '%s' does not exist in '%s'",
                                     key, bucket_name)
                    else:
                        logger.debug("Object key '%s' exists in '%s'",
                                     key, bucket_name)
                else:  # POSIX file system
                    if not os.path.exists(input_file_path):
                        bad_file_list.append(input_file_path)
                        logger.debug("File '%s' does not exist")
                    else:
                        logger.debug("File '%s' exists")

        # prefix output to protect from JSON vulnerability (stripped by
        # Angular)
        return HttpResponse(")]}',\n" + json.dumps(bad_file_list),
                            content_type="application/json")


class ChunkedFileUploadView(ChunkedUploadView):

    model = ChunkedUpload
    field_name = "files[]"


class ChunkedFileUploadCompleteView(ChunkedUploadCompleteView):

    model = ChunkedUpload

    def delete(self, request):
        try:
            upload_id = request.GET['upload_id']
        except KeyError:
            logger.error("Upload ID is missing from deletion request")
            return HttpResponseBadRequest(json.dumps({'error': 'KeyError'}),
                                          'application/json')

        try:
            chunked = ChunkedUpload.objects.get(upload_id=upload_id)
        except (ChunkedUpload.DoesNotExist,
                ChunkedUpload.MultipleObjectsReturned) as e:
            logger.error(
                "Error retrieving file upload instance with ID '%s': '%s'",
                upload_id, e)
            return HttpResponseBadRequest(json.dumps({'error': e}),
                                          'application/json')

        chunked.delete()
        return JsonResponse({'status': 'Successfully deleted.',
                             'upload_id': upload_id})

    def on_completion(self, uploaded_file, request):
        """Move file to the user's import directory"""
        try:
            upload_id = request.POST['upload_id']
        except KeyError:
            logger.error("Upload ID is missing from file upload request")
            return
        try:
            chunked_upload = ChunkedUpload.objects.get(upload_id=upload_id)
        except (ChunkedUpload.DoesNotExist,
                ChunkedUpload.MultipleObjectsReturned) as exc:
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
        chunked_upload.delete()

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
              paramType: query
              type: string
              required: false

            - name: study
              description: Study uuid
              paramType: query
              type: string
              required: false

    ...
    """

    def get_object(self, uuid):
        try:
            return Assay.objects.get(uuid=uuid)
        except (Assay.DoesNotExist, Assay.MultipleObjectsReturned):
            raise Http404

    def get_query_set(self, study_uuid):
        try:
            study_obj = Study.objects.get(
                uuid=study_uuid)
            return Assay.objects.filter(study=study_obj)
        except (Study.DoesNotExist,
                Study.MultipleObjectsReturned):
            raise Http404

    def get(self, request, format=None):
        if request.query_params.get('uuid'):
            assay = self.get_object(request.query_params.get('uuid'))
            serializer = AssaySerializer(assay)
            return Response(serializer.data)
        elif request.query_params.get('study'):
            assays = self.get_query_set(request.query_params.get('study'))
            serializer = AssaySerializer(assays, many=True)
            return Response(serializer.data)
        else:
            raise Http404


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
            - name: data_set_uuid
              description: data set uuid required to check for perms
              type: string
              paramType: query
    ...
    """

    def get(self, request, uuid, format=None):

        params = request.query_params
        data_set_uuid = params.get('data_set_uuid', None)
        # requires data_set_uuid to check perms
        if data_set_uuid:
            data_set = get_object_or_404(DataSet, uuid=data_set_uuid)
            public_group = ExtendedGroup.objects.public_group()

            if request.user.has_perm('core.read_dataset', data_set) or \
                    'read_dataset' in get_perms(public_group, data_set):
                solr_params = generate_solr_params_for_assay(params, uuid)
            elif request.user.has_perm('core.read_meta_dataset', data_set) or \
                    'read_meta_dataset' in get_perms(public_group, data_set):
                solr_params = generate_solr_params_for_assay(
                    params,
                    uuid,
                    ['REFINERY_DOWNLOAD_URL', 'REFINERY_NAME']
                )
            else:
                message = 'User does not have read permissions.'
                return Response(message, status=status.HTTP_401_UNAUTHORIZED)

            solr_response = search_solr(solr_params, 'data_set_manager')
            solr_response_json = format_solr_response(solr_response)

            return Response(solr_response_json)
        else:
            return Response(
                'Requires data set uuid.',
                status=status.HTTP_400_BAD_REQUEST
            )


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

            # if old attribute order rank == 0, then all ranks need to be set
            if attribute_order.rank == 0:
                initialize_attribute_order_ranks(attribute_order, new_rank)
            # updates all ranks in assay's attribute order
            elif new_rank and new_rank != attribute_order.rank:
                try:
                    update_attribute_order_ranks(attribute_order, new_rank)
                except Exception as e:
                    return e

            # updates the requested attribute rank with new rank
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
