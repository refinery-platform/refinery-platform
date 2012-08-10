# Create your views here.

from django.shortcuts import render_to_response, redirect
from django.template.context import RequestContext
from file_server.views import profile_viewer
import logging
import uuid

logger = logging.getLogger(__name__)


def igv_session( request ):
    
    query = request.GET.copy()
    
    try:
        uuids = query["uuids"].split( "," );
    except:
        uuids = []
        
    
    logger.info( "Uuids received: " + ", ".join( uuids ) )

    return render_to_response( "visualization_manager/igv_session.html", { "uuids": uuids } , context_instance=RequestContext( request ) )



def profile_viewer_session( request ):

    query = request.GET.copy()    
    uuid = query["uuid"];
    return profile_viewer( request, uuid=uuid, start_location=1, end_location=200000000, sequence_name="chr1" );