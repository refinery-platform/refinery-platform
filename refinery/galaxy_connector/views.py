from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.template import RequestContext
import urllib2, simplejson


def make_url( api_key, url, args=None ):
    # Adds the API Key to the URL if it's not already there.
    if args is None:
        args = []
    argsep = '&'
    if '?' not in url:
        argsep = '?'
    if '?key=' not in url and '&key=' not in url:
        args.insert( 0, ( 'key', api_key ) )
    return url + argsep + '&'.join( [ '='.join( t ) for t in args ] )

def get( api_key, url ):
    url = make_url( api_key, url )
    try:
        return simplejson.loads( urllib2.urlopen( url ).read() )
    except simplejson.decoder.JSONDecodeError, e:
        return simplejson.loads( "{}" )


def index(request):
    return HttpResponse("Refinery Galaxy Connector")

def api(request,api_key):
    return HttpResponse("Refinery Galaxy Connector<br><br>API Key: %s" % api_key )

def history(request,api_key):
    
    # NOTE: in the future the Galaxy instance URL will be replaced with the connection information
    histories = get( api_key, "http://fisher.med.harvard.edu:4216/api/histories" )
     
    return render_to_response( "galaxy_connector/histories.html", { "histories": histories }, context_instance=RequestContext( request ) )
