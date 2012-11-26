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
from annotation_server.models import taxon_id_to_genome_build, species_to_genome_build
    

logger = logging.getLogger(__name__)

# create json response to return genome_builds + file_uuids for javascript to use 
def igv_session( request ):
    
    query = request.GET.copy()
    
    try:
        uuids = query["uuids"].split( "," );
    except:
        uuids = []
            
    logger.info( str( len(uuids) ) + " file uuids received: " + ", ".join( uuids ) )
    
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
    print doc.toprettyxml(indent="  ")
    #print filestore_item.datafile.url
    
    # Url for session file 
    fs_url = filestore_item.get_url()
    
    # IGV url for automatic launch of Java Webstart
    igv_url = "http://www.broadinstitute.org/igv/projects/current/igv.php?sessionURL=" + fs_url
    
    return igv_url


def results_igv(request):
    logger.debug("visualization_manager.views results_igv called")
    
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


def igv_multi_species(solr_results, solr_annot=None):
    '''
    Takes input solr results, identifies multiple species 
    
    :param solr_results: dictionary of solr results
    :type solr_results: dictionary 
    :returns: 
    '''
    logger.debug("visualization_manager.views.igv_multi_species called")
    
    #print "solr_results"
    #print simplejson.dumps(solr_results, indent=4)
    
    #num_found = solr_results["response"]["numFound"]
    results = solr_results["response"]["docs"]
    fields = str(solr_results["responseHeader"]["params"]["fl"]).split(',')
    
    #print results
    #print fields
    #print len(fields)
    
    #print "solr_annot"
    #print solr_annot
    
    unique_species = get_unique_species(solr_results)
    if solr_annot:
        unique_annot = get_unique_species(solr_annot)
    
    # 1. check to see how many species are selected? 
    # move this to visualization_manager.utils 
    
    # 2. look for genome_build
    # then look for species to resolve for default genome build 
    
    # 3. Create sample information file 
    # i.e. http://www.broadinstitute.org/igvdata/exampleFiles/gbm_session.xml   
    # http://igv.broadinstitute.org/data/hg18/tcga/gbm/gbmsubtypes/sampleTable.txt.gz
    sampleFile = addIGVSamples(solr_results, solr_annot)
        
        
    # 4. generate igv files for each species, including phenotype data + paths generated from uuid's
    ui_results = {}
    for k,v in unique_species.items():
        
        # if file_uuids generated for given species
        # generate igv session file 
        if "file_uuid" in v:
            #print "----"
            #print "k"
            #print k
            #print "v"
            #print v
            
            # if annotation contains species 
            if solr_annot:
                if k in unique_annot:
                    temp_url = createIGVsessionAnnot(k, unique_species[k], unique_annot[k])
            else:
                temp_url = createIGVsessionAnnot(k, unique_species[k])
            #unique_species[k]['igv_url'] = temp_url
            ui_results[k] = temp_url
            print temp_url
        
    #print "unique_species"
    #print simplejson.dumps(unique_species, indent=4)    
    #print "unique_annot"
    #print simplejson.dumps(unique_annot, indent=4)    
    
    # 5. reflect buttons in the bootbox modal in UI
    #return {"test":"return from django igv"}
    return ui_results
    
def get_unique_species(docs):
    '''
    Takes input solr results, identifies unique species 
    
    :param solr_results: dictionary of solr results. 1. Checks to see if "genome_build" is a key 2. Checks and looks up species (taxon_id) to determine build
    :type solr_results: dictionary 
    :returns: a dictionary with keys for eachs species and the solr results for each species supplieed in an array 
    '''
    
    docs = docs["response"]["docs"]

    unique_species = {}
    
    for res in docs:
        # Defaults to checking for genome_build
        if "genome_build" in res:
            curr_build = str(res["genome_build"])
        
            if curr_build not in unique_species:
                #unique_species.append(res["genome_build"])
                unique_species[curr_build] = {'file_uuid':[], 'solr':[]}
            res["igv_build"] = curr_build
            unique_species[curr_build]['solr'].append(res)
            unique_species[curr_build]['file_uuid'].append(res['file_uuid'])
        
        # checks to see if species exits otherwise
        elif "species" in res:
            curr_build = str(taxon_id_to_genome_build(res["species"]))
            if curr_build not in unique_species:
                #unique_species.append(curr_build)
                unique_species[curr_build] = {'file_uuid':[], 'solr':[]}
            res["igv_build"] = curr_build
            unique_species[curr_build]['solr'].append(res)
            unique_species[curr_build]['file_uuid'].append(res['file_uuid'])
        else:
            logger.error("core.views.solr_igv: Selected Samples do not have genome_build or species associated")
    
    return unique_species
      

def createIGVsessionAnnot(genome, uuids, annot_uuids=None):
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
    logger.info("visualization_manager.createIGVsessionAnnot called")
    
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
    
    # adding selected samples to xml file
    addIGVResource(uuids["file_uuid"], xml_resources, doc)
    
    if annot_uuids:
        # adding selected samples to xml file
        addIGVResource(annot_uuids["file_uuid"], xml_resources, doc)
    
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
    print doc.toprettyxml(indent="  ")
    #print filestore_item.datafile.url
    
    # Url for session file 
    fs_url = filestore_item.get_url()
    
    # IGV url for automatic launch of Java Webstart
    igv_url = "http://www.broadinstitute.org/igv/projects/current/igv.php?sessionURL=" + fs_url
    
    return igv_url


def addIGVResource(uuidlist, xml_res, xml_doc):
    """ Adds resources to current IGV session file
    
    :param uuidlist: Array of filestore UUIDs
    :type uuidlist: Array.
    :param xml_res: Current XML resource
    :type xml_res: XML resource
    :param xml_doc: Current IGV XML document
    :type xml_doc: XML document
    """
    # get paths to url 
    for samp in uuidlist:
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
            res = xml_doc.createElement("Resource")
            res.setAttribute("name", curr_name)
            res.setAttribute("path", curr_url)
            xml_res.appendChild(res)
            
def addIGVSamples(samples, annot_samples=None):
    
    logger.info("visualization_manager.addIGVSamples called")
    
    # fields to iterate over
    fields = str(samples["responseHeader"]["params"]["fl"]).split(',')
    results_samp = samples["response"]["docs"]
    
    #print "fields"
    #print simplejson.dumps(fields, indent=4)
    #print "results_samp"
    #print simplejson.dumps(results_samp, indent=4)
    #print "results_annot"
    #print simplejson.dumps(results_annot, indent=4)
    
    # creates human readable indexes of fields to iterate over
    fields_dict = {}
    for i in fields:
        find_index = i.find("_Characteristics_")
        if find_index > -1:
            new_key = i.split("_Characteristics_")[0]
            fields_dict[i] = new_key
    
    print "fields_dict"
    print simplejson.dumps(fields_dict, indent=4)    
    
    # Creating temp file to enter into file_store
    tempsampname = tempfile.NamedTemporaryFile(delete=False)
    
    # writing header to sample file 
    tempsampname.write("#sampleTable" + "\n")
    
    # iterating over sample files 
    #for a in results_samp:
    #for k,v in fields_dict.iteritems(:)
    #getFileName()
    # iterating over sample annotation files 
    #getFileName()
    
    # if annotations are not null
    if annot_samples:
        results_annot = annot_samples["response"]["docs"]
        
    
    tempsampname.close()


    # getting file_store_uuid
    filestore_uuid = create(tempsampname.name, permanent=True, filetype="txt")
    filestore_item = import_file(filestore_uuid, permanent=True, refresh=True)
    
    # file to rename
    temp_file = filestore_item.datafile.name.split('/')
    temp_file = temp_file[len(temp_file)-1] + '.txt'
    
    # rename file by way of file_store
    filestore_item = rename(filestore_uuid, temp_file)
    
    # getting file information based on file_uuids
    curr_fs = FileStoreItem.objects.filter(uuid=filestore_uuid)[0]
    curr_name = curr_fs.datafile.name
    
    # full path to selected UUID File
    curr_url = curr_fs.get_url()
    
    ##################################################
    # debugging output
    print "----- curr_name"
    print settings.MEDIA_ROOT + "files/" + curr_name
    print curr_url
    ##################################################
    
    # delete temp file
    os.unlink(tempsampname.name)
    
    return curr_url

def getFileName(fileuuid):
    # getting file information based on file_uuids
    curr_fs = FileStoreItem.objects.filter(uuid=filestore_uuid)[0]
    curr_name = curr_fs.datafile.name
    curr_name = curr_fs.datafile.name.split('/')
    curr_name = curr_name[len(curr_name)-1]
    return curr_name

#def getSampleLine():       
    
    