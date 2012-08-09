# Create your views here.

from django.shortcuts import render_to_response
from django.template.context import RequestContext
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
