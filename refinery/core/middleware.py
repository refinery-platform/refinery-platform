from django.shortcuts import render_to_response
from psycopg2 import OperationalError
from django import http
from core.models import ExternalToolStatus, WorkflowEngine
from core.tasks import check_tool_status
import re
from datetime import datetime, timedelta

class DatabaseFailureMiddleware(object):
    def process_exception(self, request, exception):
        if isinstance(exception, OperationalError):
            context_dict = {
                            'external_tool_name': "Database",
                            'message_start': "The internal database"
                            }
            response = render_to_response('external_tool_down.html', context_dict)
            response.status_code = 500
            response.reason_phrase = "Database Problem"
            return response
        return None

class ExternalToolErrorMiddleware(object):
    def process_request(self, request):
        if not re.search('/admin/', request.path):
            #check celery
            celery_tuple = check_tool_status(ExternalToolStatus.CELERY_TOOL_NAME)
            if celery_tuple[0]:
                if celery_tuple[1] == ExternalToolStatus.TIMEOUT_STATUS:
                    context_dict = {
                                    'external_tool_name': "Timeout",
                                    'message_start': "Our database has not been updated with the status of Celery recently leading us to believe that something"
                                    }
                    response = render_to_response('external_tool_down.html', context_dict)
                    response.status_code = 500
                    response.reason_phrase = "Timeout Problem"
                    return response
                elif celery_tuple[1] == ExternalToolStatus.UNKNOWN_STATUS:
                    context_dict = {
                                    'external_tool_name': "Unknown",
                                    'message_start': "Something in Celery, we know not what,"
                                    }
                    response = render_to_response('external_tool_down.html', context_dict)
                    response.status_code = 500
                    response.reason_phrase = "Unknown Problem"
                    return response
                elif celery_tuple[1] != ExternalToolStatus.SUCCESS_STATUS:
                    context_dict = {
                                    'external_tool_name': "Celery",
                                    'message_start': "Our task dispatcher"
                                    }
                    response = render_to_response('external_tool_down.html', context_dict)
                    response.status_code = 500
                    response.reason_phrase = "Celery Problem"
                    return response

            #check solr
            solr_tuple = check_tool_status(ExternalToolStatus.SOLR_TOOL_NAME)
            if solr_tuple[0]:
                if solr_tuple[1] == ExternalToolStatus.TIMEOUT_STATUS:
                    context_dict = {
                                    'external_tool_name': "Timeout",
                                    'message_start': "Our database has not been updated with the status of Solr recently leading us to believe that something"
                                    }
                    response = render_to_response('external_tool_down.html', context_dict)
                    response.status_code = 500
                    response.reason_phrase = "Timeout Problem"
                    return response
                elif solr_tuple[1] == ExternalToolStatus.UNKNOWN_STATUS:
                    context_dict = {
                                    'external_tool_name': "Unknown",
                                    'message_start': "Something in Solr, we know not what,"
                                    }
                    response = render_to_response('external_tool_down.html', context_dict)
                    response.status_code = 500
                    response.reason_phrase = "Unknown Problem"
                    return response
                elif solr_tuple[1] != ExternalToolStatus.SUCCESS_STATUS:
                    context_dict = {
                                    'external_tool_name': "Solr",
                                    'message_start': "Solr"
                                    }
                    response = render_to_response('external_tool_down.html', context_dict)
                    response.status_code = 500
                    response.reason_phrase = "Solr Problem"
                    return response

            #check galaxy instance(s)
            for workflow_engine in WorkflowEngine.objects.all():
                instance = workflow_engine.instance
                galaxy_tuple = check_tool_status(ExternalToolStatus.GALAXY_TOOL_NAME, tool_unique_instance_identifier=instance.api_key)
                if galaxy_tuple[0]:
                    if galaxy_tuple[1] == ExternalToolStatus.TIMEOUT_STATUS:
                        context_dict = {
                                        'external_tool_name': "Timeout",
                                        'message_start': "Our database has not been updated with the status of Galaxy recently leading us to believe that something"
                                        }
                        response = render_to_response('external_tool_down.html', context_dict)
                        response.status_code = 500
                        response.reason_phrase = "Timeout Problem"
                        return response
                    elif galaxy_tuple[1] == ExternalToolStatus.UNKNOWN_STATUS:
                        context_dict = {
                                        'external_tool_name': "Unknown",
                                        'message_start': "Something in Galaxy, we know not what,"
                                        }
                        response = render_to_response('external_tool_down.html', context_dict)
                        response.status_code = 500
                        response.reason_phrase = "Unknown Problem"
                    elif galaxy_tuple[1] != ExternalToolStatus.SUCCESS_STATUS:
                        context_dict = {
                                    'external_tool_name': "Galaxy",
                                    'message_start': 'Our workflow manager' 
                                    }
                        response = render_to_response('external_tool_down.html', context_dict)
                        response.status_code = 500
                        response.reason_phrase = "Galaxy Problem"
                        return response