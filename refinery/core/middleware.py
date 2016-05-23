from django.shortcuts import render_to_response
from django.template import RequestContext

from psycopg2 import OperationalError


class DatabaseFailureMiddleware(object):
    def process_exception(self, request, exception):
        if isinstance(exception, OperationalError):
            context_dict = {
                'external_tool_name': "Database",
                'message_start': "The internal database"
            }
            response = render_to_response(
                'external_tool_down.html',
                context_dict,
                context_instance=RequestContext(request)
            )
            response.status_code = 500
            response.reason_phrase = "Database Problem"
            return response
        return None
