import logging
import os
import tempfile
from xml.dom.minidom import Document

from django.shortcuts import redirect

from annotation_server.models import taxon_id_to_genome_build, \
    genome_build_to_species
from annotation_server.utils import SUPPORTED_GENOMES
from core.utils import get_full_url
from data_set_manager.models import Node
from file_server.views import profile_viewer
from file_server.models import get_aux_file_item
from file_store.models import FileStoreItem
from file_store.tasks import import_file, create, rename

logger = logging.getLogger(__name__)


def igv_session(request):
    """create json response to return genome_builds + file_uuids for
    javascript to use
    """
    query = request.GET.copy()
    try:
        uuids = query["uuids"].split(",")
    except:
        uuids = []

    logger.info(str(len(uuids)) + " file uuids received: " + ", ".join(uuids))

    # create IGV session files for each genome build associated with the file
    # uuids
    igv_urls = []
    genome_builds = Node.objects.genome_builds_for_files(uuids, True)

    for genome_build, file_uuids in genome_builds.iteritems():
        if genome_build is not None:
            igv_urls.append(createIGVsession(genome_build, file_uuids))

    if len(igv_urls) == 0 and len(uuids) > 0:
        logger.warning("None of " + str(
            len(uuids)) + " files could be associated with a genome build.")

    logger.info("IGV sessions: " + "; ".join(igv_urls))
    # redirects to java webstart application
    return redirect(igv_urls[0])


def profile_viewer_session(request):
    query = request.GET.copy()
    uuid = query["uuid"]
    return profile_viewer(request, uuid=uuid, start_location=1,
                          end_location=200000000, sequence_name="chr1")


def createIGVsession(genome, uuids, is_file_uuid=False):
    """ Creates session file for selected file uuids, returns newly created
    filestore uuid
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
            <Resource name="RNA Genes"
            path="http://www.broadinstitute.org/igvdata/tcga/gbm/GBM_batch1-8_level3_exp.txt.recentered.080820.gct.tdf"/>
            <Resource name="RNA Genes"
            path="http://www.broadinstitute.org/igvdata/annotations/hg18/rna_genes.bed"/>
            <Resource name="sno/miRNA"
            path="http://www.broadinstitute.org/igvdata/tcga/gbm/Sample_info.txt"/>
        </Resources>
    </Global>
    """
    logger.debug("visualization_manager.createIGVsession called")

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
        curr_name, curr_url = get_file_name(samp, is_file_uuid=is_file_uuid)

        logger.debug('New resource: ' + curr_name + ' - ' + curr_url)

        # What to do if fs does not exist?
        if (curr_name):
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
    temp_name = temp_name[len(temp_name) - 1] + '.xml'
    # rename file by way of file_store
    filestore_item = rename(filestore_uuid, temp_name)
    # delete temp file
    os.unlink(tempfilename.name)
    # Url for session file
    fs_url = get_full_url(filestore_item.get_datafile_url())
    # IGV url for automatic launch of Java Webstart
    igv_url = "http://www.broadinstitute.org/igv/projects/current/igv.php" \
              "?sessionURL=" + fs_url
    return igv_url


def results_igv(request):
    logger.debug("visualization_manager.views results_igv called")

    uuids = []
    # finds all selected file_uuids to view in igv
    for i, val in request.POST.iteritems():
        if val and val != "":
            if i.startswith('igv_'):
                temp_uuid = i.replace('igv_', '')
                uuids.append(temp_uuid)

    logger.debug("uuids")
    logger.debug(uuids)
    # NEED SPECIES
    igv_url = createIGVsession("mm9", uuids, is_file_uuid=True)
    return redirect(igv_url)


def igv_multi_species(solr_results, solr_annot=None):
    """Takes input solr results, identifies multiple species
    :param solr_results: dictionary of solr results
    :type solr_results: dictionary
    :returns:
    """
    logger.debug("visualization_manager.views.igv_multi_species called")

    unique_annot = None

    fields = str(solr_results["responseHeader"]["params"]["fl"]).split(',')

    unique_species, unique_species_num = get_unique_species(solr_results)
    if solr_annot:
        unique_annot, unique_annot_num = get_unique_species(solr_annot)

    # 1. check to see how many species are selected?
    # move this to visualization_manager.utils
    # 2. look for genome_build
    # then look for species to resolve for default genome build
    # 3. Create sample information file
    # i.e. http://www.broadinstitute.org/igvdata/exampleFiles/gbm_session.xml
    # http://igv.broadinstitute.org/data/hg18/tcga/gbm/gbmsubtypes/sampleTable.txt.gz
    # 4. generate igv files for each species, including phenotype data + paths
    # generated from uuid's

    ui_results = {'species_count': unique_species_num, 'species': {}}

    for k, v in unique_species.items():
        if solr_annot is not None and solr_annot["response"]["numFound"] > 0:
            sample_file = addIGVSamples(fields, unique_species[k]['solr'],
                                        unique_annot[k]['solr'])
        else:
            sample_file = addIGVSamples(fields, unique_species[k]['solr'])

        logger.debug('Sample File: ' + sample_file)

        # if node_uuids generated for given species
        # generate igv session file
        if "node_uuid" in v:
            # adding default species name to key information
            species_id, taxon_id = genome_build_to_species(k)
            if species_id:
                species_id = species_id.split()
                species_id = species_id[0][0] + '. ' + species_id[1]

            # if annotation contains species
            if (solr_annot is not None and solr_annot["response"][
                                           "numFound"] > 0):
                if k in unique_annot:
                    temp_url = createIGVsessionAnnot(
                        k, unique_species[k], annot_uuids=unique_annot[k],
                        samp_file=sample_file)
            else:
                temp_url = createIGVsessionAnnot(k, unique_species[k],
                                                 annot_uuids=None,
                                                 samp_file=sample_file)

            if species_id:
                ui_results['species'][species_id + ' (' + k + ')'] = temp_url
            else:
                ui_results['species'][k] = temp_url

    # 5. reflect buttons in the bootbox modal in UI
    # change genome_build keys to include species name
    return ui_results


def get_unique_species(docs):
    """Takes input solr results, identifies unique species
    :param solr_results: dictionary of solr results.
    1. Checks to see if "genome_build" is a key
    2. Checks and looks up species (taxon_id) to determine build
    :type solr_results: dictionary
    :returns: a dictionary with keys for each species and the solr results for
    each species supplieed in an array
    """
    logger.debug("visualization_manager.views get_unique_species called")

    docs = docs["response"]["docs"]
    unique_species = {}
    unique_count = []
    # If results have a defined genome_build or species field
    for res in docs:
        # Defaults to checking for genome_build
        if "genome_build" in res:
            curr_build = str(res["genome_build"])
            # Number of distinct species
            if curr_build not in unique_count:
                unique_count.append(curr_build)
            if curr_build not in unique_species:
                # unique_species.append(res["genome_build"])
                unique_species[curr_build] = {'node_uuid': [], 'solr': []}
            res["igv_build"] = curr_build
            unique_species[curr_build]['solr'].append(res)
            unique_species[curr_build]['node_uuid'].append(res['uuid'])
        # checks to see if species exits otherwise
        elif "species" in res:
            curr_build = str(taxon_id_to_genome_build(res["species"]))
            # Number of distinct species
            if curr_build not in unique_count:
                unique_count.append(unique_count)
            if curr_build not in unique_species:
                # unique_species.append(curr_build)
                unique_species[curr_build] = {'node_uuid': [], 'solr': []}
            res["igv_build"] = curr_build
            unique_species[curr_build]['solr'].append(res)
            unique_species[curr_build]['node_uuid'].append(res['uuid'])
    # actual number of unique genome builds
    unique_count = len(unique_count)
    # CASE: when species is unknown, launch IGV with predefined genomes
    if not unique_species and len(docs) > 0:
        temp_species = {'node_uuid': [], 'solr': []}
        for res in docs:
            temp_species['solr'].append(res)
            try:
                temp_species['node_uuid'].append(res['uuid'])
            except KeyError as e:
                logger.error(
                    "Solr results do not have node_uuid. Reason: '%s'",
                    e.message)
                return None

        for genome in SUPPORTED_GENOMES:
            # TEMP: replacing ce10 to WS220
            if genome == 'ce10':
                genome = 'WS220'
            unique_species[genome] = temp_species

    return unique_species, unique_count


def createIGVsessionAnnot(genome, uuids, annot_uuids=None, samp_file=None):
    """Creates session file for selected file uuids, returns newly created
    filestore uuid
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
            <Resource name="RNA Genes"
            path="http://www.broadinstitute.org/igvdata/tcga/gbm/GBM_batch1-8_level3_exp.txt.recentered.080820.gct.tdf"/>
            <Resource name="RNA Genes"
            path="http://www.broadinstitute.org/igvdata/annotations/hg18/rna_genes.bed"/>
            <Resource name="sno/miRNA"
            path="http://www.broadinstitute.org/igvdata/tcga/gbm/Sample_info.txt"/>
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
    # adding selected samples to xml file
    addIGVResource(uuids["node_uuid"], xml_resources, doc)
    if annot_uuids:
        # adding selected samples to xml file
        addIGVResource(annot_uuids["node_uuid"], xml_resources, doc)
    # adds sample information file to IGV session file
    if samp_file:
        # <Resource name="Sample Information"
        # path="http://igv.broadinstitute.org/data/hg18/tcga/gbm/gbmsubtypes/sampleTable.txt.gz"/>
        # creates Resource element
        res = doc.createElement("Resource")
        res.setAttribute("name", "Sample Information")
        res.setAttribute("path", samp_file)
        xml_resources.appendChild(res)
    # <HiddenAttributes>
    #    <Attribute name="DATA FILE"/>
    #    <Attribute name="Linking_id"/>
    #    <Attribute name="DATA TYPE"/>
    # </HiddenAttributes>
    # Adding parameters to hide basic unnecessary sample info
    hidden_attr = doc.createElement("HiddenAttributes")
    xml.appendChild(hidden_attr)

    attr = doc.createElement("Attribute")
    attr.setAttribute("name", "DATA FILE")
    hidden_attr.appendChild(attr)

    attr = doc.createElement("Attribute")
    attr.setAttribute("name", "Linking_id")
    hidden_attr.appendChild(attr)

    attr = doc.createElement("Attribute")
    attr.setAttribute("name", "DATA TYPE")
    hidden_attr.appendChild(attr)

    # Creating temp file to enter into file_store
    tempfilename = tempfile.NamedTemporaryFile(delete=False)
    tempfilename.write(doc.toprettyxml(indent="  "))
    tempfilename.close()

    # getting file_store_uuid
    filestore_uuid = create(tempfilename.name, permanent=True, filetype="xml")
    filestore_item = import_file(filestore_uuid, permanent=True, refresh=True)

    # file to rename
    temp_name = filestore_item.datafile.name.split('/')
    temp_name = temp_name[len(temp_name) - 1] + '.xml'

    # rename file by way of file_store
    filestore_item = rename(filestore_uuid, temp_name)

    # delete temp file
    os.unlink(tempfilename.name)

    # Url for session file
    sessionfile_url = get_full_url(filestore_item.get_datafile_url())

    # IGV url for automatic launch of Java Webstart
    igv_url = "http://www.broadinstitute.org/igv/projects/current/igv.php" \
              "?sessionURL=" + sessionfile_url

    return igv_url


def addIGVResource(uuidlist, xml_res, xml_doc):
    """Adds resources to current IGV session file
    :param uuidlist: Array of filestore UUIDs
    :type uuidlist: Array.
    :param xml_res: Current XML resource
    :type xml_res: XML resource
    :param xml_doc: Current IGV XML document
    :type xml_doc: XML document
    """
    # get paths to url
    for node_uuid in uuidlist:
        # gets filestore item
        curr_name, curr_url = get_file_name(node_uuid)
        logger.debug("addIGVResource: name = %s, curr_url = %s",
                     curr_name, curr_url)
        # What to do if fs does not exist?
        if curr_url:
            # creates Resource element
            res = xml_doc.createElement("Resource")
            if (curr_name):
                res.setAttribute("name", curr_name)
            else:
                res.setAttribute("name", curr_url)

            res.setAttribute("path", curr_url)
            xml_res.appendChild(res)


def addIGVSamples(fields, results_samp, annot_samples=None):
    """creates phenotype file for IGV
    :param samples: Solr results for samples to be included
    :type samples: Array.
    :param annot_samples: includes annotation files included with solr results
    :type annot_samples: Array
    """
    # creates human readable indexes of fields to iterate over
    fields_dict = {}
    for i in fields:
        find_index = i.find("_Characteristics_")
        if find_index > -1:
            new_key = i.split("_Characteristics_")[0]
            fields_dict[i] = new_key

    # Creating temp file to enter into file_store
    tempsampname = tempfile.NamedTemporaryFile(delete=False)

    # writing header to sample file
    tempsampname.write("#sampleTable" + "\n")

    # writing column names to sample file
    col_names = "Linking_id"
    for k, v in fields_dict.iteritems():
        col_names = col_names + '\t' + v
    tempsampname.write(col_names + "\n")

    # iterating over sample files
    pheno_results = get_sample_lines(fields_dict, results_samp)
    tempsampname.write(pheno_results)

    # if annotations are not null
    if annot_samples:
        pheno_annot = get_sample_lines(fields_dict, annot_samples)
        tempsampname.write(pheno_annot)

    # closing temp file
    tempsampname.close()

    # getting file_store_uuid
    filestore_uuid = create(tempsampname.name, permanent=True, filetype="txt")
    filestore_item = import_file(filestore_uuid, permanent=True, refresh=True)

    # file to rename
    temp_file = filestore_item.datafile.name.split('/')
    temp_file = temp_file[len(temp_file) - 1] + '.txt'

    # rename file by way of file_store
    filestore_item = rename(filestore_uuid, temp_file)

    # getting file information based on file_uuids
    curr_fs = FileStoreItem.objects.get(uuid=filestore_uuid)

    # full path to selected UUID File
    curr_url = get_full_url(curr_fs.get_datafile_url())

    # delete temp file
    os.unlink(tempsampname.name)

    return curr_url


def get_file_name(nodeuuid, sampFile=None, is_file_uuid=False):
    """Helper function for getting a file_name from a filestore uuid
    :param fileuuid: Filestore uuid
    :type fileuuid: String
    """
    # if uuid is a file_store uuid (associated w/ analysis results)
    if is_file_uuid:
        temp_fs = FileStoreItem.objects.get(uuid=nodeuuid)
    else:
        # getting the current file_uuid from the given node_uuid
        curr_file_uuid = Node.objects.get(uuid=nodeuuid).file_uuid
        # checking to see if it has a file_server item
        temp_fs = get_aux_file_item(curr_file_uuid)

    # If no associated file_server auxiliary file then use main data file for
    # IGV
    if temp_fs is None:
        # getting file information based on file_uuids
        temp_fs = FileStoreItem.objects.get(uuid=curr_file_uuid)

    temp_name = temp_fs.datafile.name.split('/')
    temp_name = temp_name[len(temp_name) - 1]

    # full path to selected UUID File
    temp_url = get_full_url(temp_fs.get_datafile_url())

    # IGV SEG FILE HACK
    if sampFile:
        if temp_name.startswith("metaData"):
            new_name = temp_name.split("_")
            if len(new_name) > 1:
                temp_name = new_name[0]

    return temp_name, temp_url


def get_sample_lines(fields, results):
    """Helper function for producing a matrix of solr fields and results
    :param fields: A dictionary containing solr encoded variables and human
    readable version of the keys
    :type fields: Dictionary
    :returns: a string of the matrix to be included in the IGV sample
    information file
    """
    output_mat = ""
    # iterating over samples
    for row in results:
        # adding file_name to matrix as linking id
        line, url = get_file_name(row["uuid"], sampFile=True)
        # adding fields to sample information matrix
        for k, v in fields.iteritems():
            if k in row:
                line = line + '\t' + row[k]
            else:
                line = line + '\t' + ''

        output_mat = output_mat + line + '\n'
    # returns matrix for given inputs
    return output_mat
