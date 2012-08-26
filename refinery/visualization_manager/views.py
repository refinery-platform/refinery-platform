# Create your views here.

from django.shortcuts import render_to_response, redirect
from django.template.context import RequestContext
from file_server.views import profile_viewer
import logging
import uuid
from file_store.models import FileStoreItem
from django.conf import settings
from django.contrib.sites.models import Site
import tempfile, os
from xml.dom.minidom import Document
from file_store.models import FileStoreItem
from file_store.tasks import import_file, create, rename
from settings import MEDIA_URL, FILE_STORE_DIR

logger = logging.getLogger(__name__)


def igv_session( request ):
    
    query = request.GET.copy()
    
    try:
        uuids = query["uuids"].split( "," );
    except:
        uuids = []
        
    
    logger.info( "Uuids received: " + ", ".join( uuids ) )
    
    # TODO: How to tell which genome? 
    
    # Create IGV session file 
    fs_item = createIGVsession("hg18", uuids, request.get_host())
    
    # Url for session file 
    fs_url = "http://" + request.get_host() + "/" + MEDIA_URL + "/" + FILE_STORE_DIR + "/" + fs_item.datafile.url
    
    # IGV url for automatic launch of Java Webstart
    igv_url = "http://www.broadinstitute.org/igv/projects/current/igv.php?sessionURL=" + fs_url
    
    logger.info("Starting IGV: " + igv_url)
    
    # redirects to java webstart application 
    return redirect(igv_url)         
    #return render_to_response( "visualization_manager/igv_session.html", { "uuids": uuids } , context_instance=RequestContext( request ) )

def profile_viewer_session( request ):

    query = request.GET.copy()    
    uuid = query["uuid"];
    return profile_viewer( request, uuid=uuid, start_location=1, end_location=200000000, sequence_name="chr1" );


def createIGVsession(genome, uuids, host_url):
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
            curr_url = "http://" + host_url + "/" + MEDIA_URL + "/" + FILE_STORE_DIR + "/" + curr_fs.datafile.url            
            
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
    
    return filestore_item
    
    