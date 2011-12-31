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
    histories = get( api_key, "http://localhost:8080/api/histories" )
     
    #template = loader.get_template('galaxy_connector/histories.html')
    #context = Context({ 'histories': histories, })

    #return HttpResponse(template.render(context))
    #return render_to_response( "galaxy_connector/histories.html", { "histories": histories } )
    return render_to_response( "galaxy_connector/histories.html", { "histories": histories }, context_instance=RequestContext( request ) )
