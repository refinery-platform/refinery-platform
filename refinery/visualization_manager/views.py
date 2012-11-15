# Create your views here.

from django.conf import settings
from django.contrib.sites.models import Site
from django.core import serializers
from django.http import HttpResponse
from django.shortcuts import render_to_response, redirect
from django.template.context import RequestContext
from django.utils import simplejson
from file_server.views import profile_viewer
from file_store.models import FileStoreItem, FileStoreItem
from file_store.tasks import import_file, create, rename
from refinery.data_set_manager.models import Node
from settings import MEDIA_URL, FILE_STORE_DIR
from xml.dom.minidom import Document
import logging
import tempfile
import os
import uuid

logger = logging.getLogger(__name__)

# create json response to return genome_builds + file_uuids for javascript to use 


def igv_session( request ):
    
    query = request.GET.copy()
    
    try:
        uuids = query["uuids"].split( "," );
    except:
        uuids = []
            
    logger.info( str( len(uuids) ) + " file uuids received: " + ", ".join( uuids ) )
    
    # Create IGV session file         
    #igv_url = createIGVsession( "mm8", uuids)
    
    # create IGV session files for each genome build associated with the file uuids 
    igv_urls = []    
    genome_builds = Node.objects.genome_builds_for_files( uuids, True )
    
    for genome_build, file_uuids in genome_builds.iteritems():
        if genome_build is not None:
            igv_urls.append( createIGVsession( genome_build, file_uuids ) )
    
    if len( igv_urls ) == 0 and len( uuids ) > 0:
        logger.warning( "None of " + str( len( uuids ) ) + " files could be associated with a genome build." )                      
    
    logger.info( "IGV sessions: " + "; ".join( igv_urls ) )
    
    # redirects to java webstart application 
    return redirect(igv_urls[0])         
    #return render_to_response( "visualization_manager/igv_session.html", { "uuids": uuids } , context_instance=RequestContext( request ) )


def profile_viewer_session( request ):

    query = request.GET.copy()    
    uuid = query["uuid"];
    return profile_viewer( request, uuid=uuid, start_location=1, end_location=200000000, sequence_name="chr1" );


def createIGVsession(genome, uuids):
    """ Creates session file for selected file uuids, returns newly created filestore uuid 
    
    :param genome: Genome to be used in session file i.e. hg18, dm3
    :type genome: string.
    :param uuids: Array of UUIDs to be used
    :type uuids: array.
    :param uuids: Host URL i.e. 127.0.0.1:8000
    :type uuids: string
    """
    
    # Create IGV Session file and put into Filestore
    """
    http://www.postneo.com/projects/pyxml/
    
    <?xml version="1.0" encoding="UTF-8"?>
        <Global genome="hg18" locus="EGFR" version="3">
        <Resources>
            <Resource name="RNA Genes" path="http://www.broadinstitute.org/igvdata/tcga/gbm/GBM_batch1-8_level3_exp.txt.recentered.080820.gct.tdf"/>
            <Resource name="RNA Genes" path="http://www.broadinstitute.org/igvdata/annotations/hg18/rna_genes.bed"/>
            <Resource name="sno/miRNA" path="http://www.broadinstitute.org/igvdata/tcga/gbm/Sample_info.txt"/>
        </Resources>
    </Global>
    """
    logger.info("visualization_manager.createIGVsession called")
    
    # Create the minidom document
    doc = Document()
    
    # Create the <wml> base element
    xml = doc.createElement("Global")
    xml.setAttribute("genome", genome)
    xml.setAttribute("locus", "All")
    xml.setAttribute("version", "4")
    doc.appendChild(xml)
    
    # Add Resources
    xml_resources = doc.createElement("Resources")
    xml.appendChild(xml_resources)
    
    # get paths to url 
    for samp in uuids:
        # gets filestore item 
        curr_fs = FileStoreItem.objects.filter(uuid=samp)[0]
        
        # What to do if fs does not exist? 
        if (curr_fs):
            
            # gets file name 
            curr_name = curr_fs.datafile.name.split('/')
            curr_name = curr_name[len(curr_name)-1]
            
            # full path to selected UUID File
            curr_url = curr_fs.get_url()
            
            # creates Resource element 
            res = doc.createElement("Resource")
            res.setAttribute("name", curr_name)
            res.setAttribute("path", curr_url)
            xml_resources.appendChild(res)
            
    
    # Creating temp file to enter into file_store
    tempfilename = tempfile.NamedTemporaryFile(delete=False)
    tempfilename.write(doc.toprettyxml(indent="  "))
    tempfilename.close()
    
    # getting file_store_uuid
    filestore_uuid = create(tempfilename.name, permanent=True, filetype="xml")
    filestore_item = import_file(filestore_uuid, permanent=True, refresh=True)
    
    # file to rename
    temp_name = filestore_item.datafile.name.split('/')
    temp_name = temp_name[len(temp_name)-1] + '.xml'
    
    # rename file by way of file_store
    filestore_item = rename(filestore_uuid, temp_name)
    
    # delete temp file
    os.unlink(tempfilename.name)
    
    # Print our newly created XML
    #print doc.toprettyxml(indent="  ")
    #print filestore_item.datafile.url
    
    # Url for session file 
    fs_url = filestore_item.get_url()
    
    # IGV url for automatic launch of Java Webstart
    igv_url = "http://www.broadinstitute.org/igv/projects/current/igv.php?sessionURL=" + fs_url
    
    return igv_url


def results_igv(request):
    logger.info("visualization_manager results_igv called")
    
    uuids = []
    
    # finds all selected file_uuids to view in igv
    for i, val in request.POST.iteritems():
        if (val and val != ""):
            if (i.startswith('igv_')):
                temp_uuid = i.replace('igv_', '')
                uuids.append(temp_uuid)
                
    ### NEED SPECIES ###          
    igv_url = createIGVsession("mm9", uuids)
    
    return redirect(igv_url)  