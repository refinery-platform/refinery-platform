from django.core.management.base import LabelCommand
from datetime import datetime
from refinery.refinery_repository.models import *
import csv, sys, re, string, os, glob
from collections import defaultdict
from django.db import connection
from django.conf import settings 


class Command(LabelCommand):
    
    help = "Takes the directory of an ISA-Tab file as input, parses, and"
    help = "%s inputs it into the database" % help
    
    args = '[isatab_directory ...]'


    """
    Name: handle_label
    Description:
        main program; calls the parsing and insertion functions
    """   
    def handle_label(self, label, **options):
        
        """
        Name: get_raw_url
        Description:
            fixes the malformed URL and returns the fixed version
        Parameters:
            ftp_file (malformed download URL)
        """
        def get_raw_url(ftp_file):
            #list that has different parts of final ftp link to concatenate
            ftp = ["ftp://ftp.sra.ebi.ac.uk/vol1/fastq"]
    
            """isolate the file name"""
            #get the index of the last / in the given ftp link
            rind = string.rindex(ftp_file, '/')
            #take substring from the last slash to the end of given ftp link
            f_name = ftp_file[rind+1:] #file name
    
            #add first 6 characters of the ENA/SRA accession to list
            ftp.append(f_name[:6])
    
            #isolate the ENA/SRA accession number
            split = f_name.split('.') #split on "." for ENA/SRA acc (ind=0)
            #if paired-end data, remove the _1/_2 from end before list append
            if re.search(r'_(1|2)$', split[0]):
                #add everything but last 2 chars (_1 or _2)
                ftp.append(split[0][:-2])
            else:
                ftp.append(split[0]) 
    
            #if getting FASTQ file, make sure gzip version
            if re.search(r'\.fastq$', f_name):
                f_name += ".gz"
            #add file name to the end of the list
            ftp.append(f_name)
    
            #concatenate everything to get the final FTP link
            ftp_url = string.join(ftp, '/')
            return ftp_url

        """
        Name: get_zipped_url
        Description:
            fixes the malformed URL and returns the fixed version
        Parameters:
            ftp_file (malformed download URL)
            acc (associated investigation study identifier)
        """
        def get_zipped_url(ftp_file, acc):
            #isolate the file name
            #get the index of the last / in the given ftp link
            rind = string.rindex(ftp_file, '/')
            #take substring from the last slash to the end of given ftp link
            f_name = ftp_file[rind+1:] #file name
    
            #format final url, plugging in the accession and the file name
            url = "http://www.ebi.ac.uk/arrayexpress/files"
            url = "%s/%s/%s" % (url, acc, f_name)
            return url
        
        """
        Name: get_subtype
        Description:
            extracts the sub-type from the Characteristic or Factor Value
            header
        Parameters:
            field: the text from the header field that's being parsed
        """
        def get_subtype(field):
            #get the positions of the [] that surround the sub-type
            left_bracket = string.index(field, '[')
            right_bracket = string.rindex(field, ']')
            
            #get everything between [] and uppercase it
            subtype = field[left_bracket+1:right_bracket].upper()
            
            #substitute spaces with underscores
            sub_type = string.join(string.split(subtype, ' '), '_')
            #return the sub-type
            return sub_type 

        """
        Name: parse_investigation_file
        Description:
            parse the fields relevant to our Django model and put them into a
            dictionary
        Parameters:
            i_file: path to investigation file
        """
        def parse_investigation_file(i_file):
            invest_info = {
                           'tor': defaultdict(list), #investigator
                           'tion': defaultdict(list), #investigation
                           'ont': defaultdict(list), #ontology
                           'sdd': defaultdict(list), #study design descriptor
                           'sf': defaultdict(list), #study factor
                           'prot': defaultdict(list), #protocol
                           'pub': defaultdict(list) #publication
                           }
            #read in investigation file
            file_reader = open(i_file, 'rb')
            
            #grab the investigation file values
            current_header = ""
            for row in file_reader:
                #list comprehension that splits on tabs and strips each
                #element of the array of flanking whitespace
                fields = [x.strip() for x in string.split(row, '\t')]
                #if all caps, designate the dictionary the information will go into
                if re.search(r'[A-Z]{4}', fields[0]): #not a section header
                    if re.search(r'ONTOLOGY SOURCE REFERENCE', row):
                        current_header = 'ont'
                    elif re.search(r'INVESTIGATION', row):
                        current_header = 'investigation'
                    elif re.search(r'STUDY DESIGN', row):
                        current_header = 'sdd'
                    elif re.search(r'STUDY PUBLICATIONS', row):
                        current_header = 'pub'
                    elif re.search(r'STUDY FACTORS', row):
                        current_header = 'sf'
                    elif re.search(r'STUDY PROTOCOLS', row):
                        current_header = 'prot'
                    elif re.search(r'STUDY CONTACTS', row):
                        current_header = 'tor'
                    elif re.search(r'STUDY ASSAYS', row) or re.search(r'STUDY', row):
                        current_header = 'tion'   
                else: #if an information row, then push the information into the dictionary
                    if not current_header == 'investigation':
                        #database columns are the header names, made lower
                        #case and joined by "_" (e.g. study_title)
                        name = fields.pop(0).lower()
                        
                        #remove surrounding "s
                        fields = [x.strip(r'"') for x in fields]
                        
                        db_col = string.join(string.split(name, ' '), '_')
                        if(db_col):
                            invest_info[current_header][db_col] = fields
                    
            #after finished grabbing information, organize it into lists of 
            #dictionaries
            key_terms = { #important terms to each dictionary
                         'ont': 'term_source_name',
                         'tor': 'study_person_email',
                         'sdd': 'study_design_type',
                         'sf': 'study_factor_name',
                         'pub': 'study_pubmed_id',
                         'prot': 'study_protocol_name',
                         'tion': 'study_identifier'
                         }
            investigation = defaultdict(list) #object to return
            #v is dict of lists e.g. {'address': ['', ''], 'phone': ['', '']}
            for k, v in invest_info.items():
                #column indexes that have information to grab for each section
                indexes = list() 
                for i, val in enumerate(v[key_terms[k]]):
                    if not re.search(r'^\s*$', val): #make sure val not empty
                        indexes.append(i)
                        
                #for every column that has information to insert
                for i in indexes:
                    temp_dict = dict()
                    #inv_key (e.g. study_person_fax, study_protocol_name)
                    for inv_key, inv_list in v.items():
                        try:
                            temp_dict[inv_key] = inv_list[i]
                        except IndexError:
                            pass
                    investigation[k].append(temp_dict)
            
            return investigation

        """
        Name: insert_investigation
        Description:
            inserts investigation information & investigator information
        Parameters:
            i_dict: dictionary of investigation file
        """
        def insert_investigation(i_dict):
            tor_list = i_dict['tor'] #investigator
            tion_dict = i_dict['tion'][0] #investigation
            ont_list = i_dict['ont'] #ontology
            prot_list = i_dict['prot'] #protocols
            sdd_list = i_dict['sdd'] #study design descriptors
            sf_list = i_dict['sf'] #study factors
            pub_list = i_dict['pub'] #publications

            # "**" converts dictionary to arguments
            #make sure dates are datetime.date objects
            for k, v in tion_dict.items():
                if re.search(r'_date', k):
                    try:
                        the_date = datetime.strptime(v, '%Y-%m-%d').date()
                        tion_dict[k] = the_date
                    except ValueError:
                        del tion_dict[k]

            investigation = Investigation(**tion_dict)
            investigation.save()
            
            #add investigation to tor dictionary and insert investigator(s)
            
            for tor_dict in tor_list:
                #in case there are unicode characters
                #authors = pub_dict['study_publication_author_list']
                #insert_authors = authors.decode('utf-8')
                #pub_dict['study_publication_author_list'] = insert_authors
                
                investigator = Investigator(**tor_dict)
                investigator.save()
                    
                #add investigation to investigator
                investigator.investigations.add(investigation)


            #add investigation to ont dictionary and insert ontology/ontologies
            for ont_dict in ont_list:
                ontology = Ontology(**ont_dict)
                try:
                    ontology.save()
                except:
                    connection._rollback()
                    name = ont_dict['term_source_name']
                    try:
                        file = ont_dict['term_source_file']
                    except KeyError:
                        file = ''
                    try:
                        ver = ont_dict['term_source_version']
                    except KeyError:
                        ver = ''
                    
                    ontology = Ontology.objects.get(term_source_name=name,
                                                    term_source_file=file,
                                                    term_source_version=ver)
                    
                #add ontology to investigation
                investigation.ontologies.add(ontology)

            #add investigation to pub dictionary and insert publication(s)
            for pub_dict in pub_list:
                #using foreign key, so need to assign
                pub_dict['investigation'] = investigation
                
                #in case there are unicode characters
                authors = unicode(pub_dict['study_publication_author_list'])
                insert_authors = authors
                pub_dict['study_publication_author_list'] = insert_authors
                
                publication = Publication(**pub_dict)
                publication.save()
                    
            #add investigation to prot dictionary and insert protocol(s)
            for prot_dict in prot_list:
                protocol = Protocol(**prot_dict)
                protocol.save()
                    
                #add investigation to protocol
                protocol.investigation_set.add(investigation)
            
            #add investigation to sdd dictionary and insert study design descriptor(s)
            for sdd_dict in sdd_list:
                #add investigation as Foreign Key
                sdd_dict['investigation'] = investigation
                #create StudyDesignDescriptor
                sdd = StudyDesignDescriptor(**sdd_dict)
                sdd.save()
                    
            #add investigation to prot dictionary and insert protocol(s)
            for sf_dict in sf_list:
                #add investigation as Foreign Key
                sf_dict['investigation'] = investigation
                #create StudyFactor
                sf = StudyFactor(**sf_dict)
                sf.save()

            return investigation

        """
        Name: parse_study_file
        Description:
            parse the fields relevant to our Django model and put them into a
            dictionary
        Parameters:
            s_file: path to study file
        """
        def parse_study_file(s_file):
            #dictionary of dictionary of lists
            study_info = {
                          'study': list(),
                          'comment': list(),
                          'characteristics': list(),
                          'protocol': list()
                          }
            
            #read in study file
            file_reader = csv.reader(open(s_file, 'rb'), dialect='excel-tab')
    
            #grab first row to get field headers
            header_row = file_reader.next()
            #dictionary that correlates column index and header text
            header = dict()
            for i, j in enumerate(header_row):
                if re.search(r'Term Source REF', j):
                    header[i] = "%s %s" % (str(i - 1), j)
                elif re.search(r'Term Accession Number', j):
                    header[i] = "%s %s" % (str(i - 2), j)
                else:
                    header[i] = j
            
            #iterate over the file
            for i, row in enumerate(file_reader):
                #some data structures for temporary insertion
                protocols = list()
                dictionary = defaultdict(dict)

                for j, field in enumerate(row):
                    if not re.search(r'^\s*$', field):
                        #comment or characteristic
                        if re.search(r"\[.+\]", header[j]):
                            #return everything before '[' and lowercase it
                            key = string.split(header[j], '[').pop(0).lower().strip()
                            sub_key = get_subtype(header[j])
                        
                            #assign values
                            try:
                                dictionary['b'][key][sub_key]['sub_type'] = sub_key
                            except KeyError:
                                dictionary['b'][key] = defaultdict(dict)
                                dictionary['b'][key][sub_key]['sub_type'] = sub_key
                            
                            dictionary['b'][key][sub_key]['type'] = key
                            dictionary['b'][key][sub_key]['value'] = field
                        else:
                            #get name of the header with '_' substituted for ' ' and lowercase
                            key_parts = [x.lower().strip() for x in string.split(header[j], ' ')]
                            key = string.join(key_parts, '_')
                        
                            if re.search(r'Protocol ', header[j]):
                                protocols.append(field)
                            elif re.search(r'^[0-9]+ Term', header[j]):
                                #isolate index of corresponding characteristic
                                #and prepare to substitute underscores for spaces
                                split = string.split(header[j], ' ')
                                #get Characteristics[something]
                                char = header[int(split.pop(0))]
                                sub_type = get_subtype(char)
                                #key is the key for study_info
                                key = string.split(char, '[').pop(0).lower().strip()
                                #field header
                                sub_key = string.join(split, '_').lower()
                        
                                #'i' is the row index; position of subtype list 
                                dictionary['b'][key][sub_type][sub_key] = field
                            else:
                                dictionary['s'][key] = field
                #append list of protocol lists
                study_info['protocol'].append(protocols)
                
                #assign row number to end of dicts so we know what's together
                #and append them to the study_info
                dictionary['s']['row_num'] = i
                study_info['study'].append(dictionary['s'])
                #organize bracketed items into proper categories
                for d in dictionary['b']:
                    for k in dictionary['b'][d]:
                        temp = dictionary['b'][d][k]
                        temp['row_num'] = i
                        study_info[d].append(temp)
                        
            #print study_info

            return study_info
        
        """
        Name: insert_study
        Description:
            insert study information
        Parameters:
            s_dict: dictionary of study file
            investigation: corresponding investigation
            protocols: dictionary of protocols and abbreviations
        """
        def insert_study(investigation, s_dict, protocols):
            comment_list = s_dict['comment']
            study_list = s_dict['study']
            char_list = s_dict['characteristics']
            prot_list = s_dict['protocol']
            
            #list of studies entered, needs to be returned
            s_list = list()
            #row_num: study pairs, makes it easy to associate other models
            #to the proper study
            study_dict = dict()
            
            #insert studies
            #print '\n study \n'
            for s in study_list:
                #remove row number from the dictionary
                row_num = s['row_num']
                del s['row_num']
                
                #grab associated investigation
                s['investigation'] = investigation
                #print s
                #create assay 
                study = Study(**s)
                study.save()
                
                #add to study_dict for the other models to use
                study_dict[row_num] = study
                #add to list for returning
                s_list.append(study)
            
            #insert comments
            #print '\n comments \n'
            for c in comment_list:
                row_num = c['row_num']
                del c['row_num']
                
                #grab asssociated study
                study = study_dict[row_num]
                c['study'] = study
                #print c
                #create Comment
                comment = StudyBracketedField(**c)
                comment.save()
                    
            #insert characteristics
            #print '\n char \n'
            for c in char_list:
                row_num = c['row_num']
                del c['row_num']
                
                #grab asssociated study
                study = study_dict[row_num]
                c['study'] = study
                #print c
                #create Comment
                characteristic = StudyBracketedField(**c)
                characteristic.save()
            
            #insert protocols
            for i, p in enumerate(prot_list):
                s = study_dict[i]
                for prot in p:
                    s.protocols.add(protocols[prot])
                    
            return s_list
               
        """
        Name: parse_assay_file
        Description:
            parse the fields relevant to our Django model and put them into a
            dictionary
        Parameters:
            a_file: path to assay file
            accession: associated investigation study identifier
        """
        def parse_assay_file(a_file, accession):
            assay_info = {
                          'raw_data': list(),
                          'processed_data': list(),
                          'protocol': list(),
                          'assaybracketedfield': list(),
                          'assay': list()
                          }
            #read in assay file, can't use dictionary because keys may be 
            #potentially overwritten
            file_reader = csv.reader(open(a_file, 'rb'), dialect='excel-tab')
            
            sub_terms = {
                         'Hybridization Assay Name': 'Assay Name',
                         'Array Data File': 'Raw Data File',
                         'Derived Array Data Matrix File': 'Derived Data File',
                         'Comment [Derived ArrayExpress FTP file]': 'Derived ArrayExpress FTP file',
                         'Comment [ArrayExpress FTP file]': 'Raw Data File',
                         'Comment [FASTQ URI]': 'Raw Data File'
                         }
            
            #grab first row to get field headers
            header_row = file_reader.next()
            #dictionary that correlates column index and header text
            header = dict()
            current_protocol = 0
            for i, j in enumerate(header_row):
                if j in sub_terms:
                    j = sub_terms[j]

                if re.search(r'Term Source REF', j):
                    if re.search(r'\[', header[i-1]):
                        header[i] = "%s %s" % (str(i - 1), j)
                    else:
                        header[i] = j
                elif re.search(r'Term Accession Number', j):
                    if re.search(r'\[', header[i-2]):
                        header[i] = "%s %s" % (str(i - 2), j)
                    else:
                        header[i] = j
                elif re.search(r'Parameter', j):
                    header[i] = "%s %s" % (current_protocol, j)
                else:
                    header[i] = j
                    if re.search(r'Protocol', j):
                        current_protocol = i
            
            for i, row in enumerate(file_reader):
                protocols = list()
                dictionary = defaultdict(dict)
                for j, field in enumerate(row):
                    if not re.search(r'^\s*$', field): #if not empty
                        if re.search(r'Raw Data', header[j]):
                            if not re.search(r'\.zip$', field):
                                raw_file = get_raw_url(field)
                            else:
                                raw_file = get_zipped_url(field)
                            if not 'raw_data_file' in dictionary['r']:
                                dictionary['r']['raw_data_file'] = raw_file
                            else: #paired end data (2 raw data files)
                                raw = list()
                                raw.append(dictionary['r']['raw_data_file'])
                                raw.append(raw_file)
                                dictionary['r']['raw_data_file'] = raw
                        elif re.search(r'\[.+\]', header[j]):
                            sub_key = get_subtype(header[j])
                            
                            key = string.split(header[j], '[').pop(0).lower().strip()
                            key_parts = string.split(key, ' ')
                            
                            #index of associated protocol if parameter value
                            protocol_ind = 0
                            if re.search(r'^[0-9]+', key):
                                 protocol_ind = key_parts.pop(0)
                            key = string.join(key_parts, '_')
                        
                            #assign values
                            try:
                                dictionary['b'][key][sub_key]['sub_type'] = sub_key
                            except KeyError:
                                dictionary['b'][key] = defaultdict(dict)
                                dictionary['b'][key][sub_key]['sub_type'] = sub_key

                            dictionary['b'][key][sub_key]['type'] = key
                            dictionary['b'][key][sub_key]['value'] = field
                            
                            #will only run if protocol_ind has a value other than 0
                            if protocol_ind:
                                ind = int(protocol_ind)
                                dictionary['b'][key][sub_key]['protocol'] = row[ind]
                        else:
                            #get name of the header with '_' substituted for ' '
                            #and lowercase
                            key_parts = [x.lower().strip() for x in string.split(header[j], ' ')]
                            key = string.join(key_parts, '_')
                        
                            if re.search(r'Derived', header[j]):
                                if re.search(r'FTP', header[j]):
                                    field = get_zipped_url(field, accession)

                                dictionary['p'][key] = field
                            elif re.search(r'Protocol REF', header[j]):
                                protocols.append(field)
                            elif re.search(r'Data Transformation', header[j]):
                                if 'raw_data_file' in dictionary['r']:
                                    dictionary['r'][key] = field
                                else:
                                    dictionary['a'][key] = field
                            elif re.search(r'^[0-9]+ Term', header[j]):
                                #isolate index of corresponding characteristic
                                #and prepare to substitute '_' for ' '
                                split = string.split(header[j], ' ')
                                #get Factor Value[something]
                                fv = header[int(split.pop(0))]
                                
                                sub_type = get_subtype(fv)
                                #key is the key for assay_info
                                key = string.split(fv, '[').pop(0).lower().strip()
                                key = re.sub(r' ', r'_', key)
                                #field header
                                sub_key = string.join(split, '_').lower()
                                
                                dictionary['b'][key][sub_type][sub_key] = field
                            else:
                                dictionary['a'][key] = field
                    
                assay_info['protocol'].append(protocols)

                #print dictionary
                #print
                if dictionary['r']:
                    #assign row number to dict so we know what's together
                    dictionary['r']['row_num'] = i
                    assay_info['raw_data'].append(dictionary['r'])
                    del dictionary['r']
                if dictionary['a']:
                    #assign row number to dict so we know what's together
                    dictionary['a']['row_num'] = i
                    assay_info['assay'].append(dictionary['a'])
                    del dictionary['a']
                if dictionary['p']:
                    #assign row number to dict so we know what's together
                    dictionary['p']['row_num'] = i
                    assay_info['processed_data'].append(dictionary['p'])
                    del dictionary['p']
                
                #can't iterate an int, so delete and re-add later
                try:
                    #organize bracketed items into proper categories
                    for d in dictionary['b']:
                        for k in dictionary['b'][d]:
                            temp = dictionary['b'][d][k]
                            temp['row_num'] = i
                            assay_info['assaybracketedfield'].append(temp)
                except KeyError: #no bracketed information
                    pass
                
            return assay_info
    
        """
        Name: insert_assay
        Description:
            insert study and assay information
        Parameters:
            investigation: corresponding investigation
            s_list: list of associated study objects
            a_dict: dictionary of assay file
            protocols: dictionary of protocols and abbreviations
        """
        def insert_assay(investigation, s_list, a_dict, protocols):
            assay_list = a_dict['assay']
            raw_list = a_dict['raw_data']
            processed_list = a_dict['processed_data']
            abf_list = a_dict['assaybracketedfield']
            prot_list = a_dict['protocol']
            
            #make study list a study dictionary instead so it's easier for
            #assays to find their associated studies
            s_dict = dict()
            for s in s_list:
                s_dict[s.sample_name] = s
            
            assay_dict = dict()
            #print '\n assay \n'
            for a in assay_list:
                #remove row number from the dictionary
                row_num = a['row_num']
                del a['row_num']
                
                #grab associated study and investigation
                study = s_dict[a['sample_name']]
                a['study'] = study
                a['investigation'] = investigation
                #print a
                #create assay 
                assay = Assay(**a)
                assay.save()
                
                #add to assay_dict for the other models to use
                assay_dict[row_num] = assay
            
            """ Many to Manys """    
            #print '\n raw data \n'
            for r in raw_list:
                row_num = r['row_num']
                del r['row_num']
                
                #grab asssociated assay
                assay = assay_dict[row_num]

                #create RawData
                multiple_raws = r['raw_data_file']
                if len(multiple_raws) < 3:
                    #delete the list since it's backed up
                    del r['raw_data_file']
                    for i in multiple_raws:
                        #replace the contents of 'raw_data_file'
                        r['raw_data_file'] = i
                        #print r
                        raw_data = RawData(**r)
                        raw_data.save()
                        
                        #associate the assay
                        raw_data.assay_set.add(assay)
                else:
                    #print r
                    raw_data = RawData(**r)
                    raw_data.save()
                    
                    #associate the assay
                    raw_data.assay_set.add(assay)
                
            #print '\n processed data \n'
            for p in processed_list:
                row_num = p['row_num']
                del p['row_num']
                
                #grab asssociated assay
                assay = assay_dict[row_num]
                
                #create ProcessedData
                #print p
                processed_data = ProcessedData(**p)
                processed_data.save()
                
                #associate the assay
                processed_data.assay_set.add(assay)
                
            #insert protocols
            #print '\n protocols \n'
            for i, p in enumerate(prot_list):
                a = assay_dict[i]
                for prot in p:
                    try:
                        a.protocols.add(protocols[prot])
                    except KeyError:
                        protocol = Protocol(study_protocol_name=prot)
                        protocol.save()
                        a.protocols.add(protocol)
                        #add to hash for future look up 
                        protocols[prot] = protocol
                
            #print '\n assay bracketed field \n'
            for abf in abf_list:
                row_num = abf['row_num']
                del abf['row_num']
                
                #grab asssociated assay
                assay = assay_dict[row_num]
                abf['assay'] = assay
                
                #if a parameter value (protocol field not empty), associate
                #the proper protocol
                if 'protocol' in abf:
                    abf['protocol'] = protocols[abf['protocol']]
                #create AssayBracketedField
                assay_bracket_field = AssayBracketedField(**abf)
                assay_bracket_field.save()


        """ main program starts """
        base_dir = settings.ISA_TAB_DIR

        isa_ref = label
        print label
        
        isa_dir = os.path.join(base_dir, isa_ref)
        
        assert os.path.isdir(isa_dir), "Invalid Accession: %s" % isa_ref

        
        #assign files to proper file locations and make sure they're correct    
        investigation_file = glob.glob("%s/i_*.txt" % isa_dir).pop()
        assert os.path.exists(investigation_file), "%s" % investigation_file
        
        study_file = glob.glob("%s/s_*.txt" % isa_dir).pop()
        assert os.path.exists(study_file), "Not study file %s" % study_file
        
        assay_file = glob.glob("%s/a_*.txt" % isa_dir).pop()
        assert os.path.exists(assay_file), "Not assay file %s" % assay_file

        investigation_dict = parse_investigation_file(investigation_file)
        investigation = insert_investigation(investigation_dict)
        #investigation = Investigation.objects.get(pk='E-GEOD-16375')
        
        #get a dictionary of possible protocol names in the studies and assays
        #so it's easier to associate them to the originals
        protocol_list = investigation.protocols.all()
        protocols = dict()
        for p in protocol_list:
            name = p.study_protocol_name
            protocols[name] = p
            #create an abbreviated name
            #get the number on the end of the full protocol name
            number = string.split(name, '-').pop()
            abbr = "P--%s" % number
            protocols[abbr] = p
        
        study_dict = parse_study_file(study_file)
        studys_list = insert_study(investigation, study_dict, protocols)
        #studys_list = investigation.study_set.all()
    
        assay_dict = parse_assay_file(assay_file, investigation.study_identifier)
        insert_assay(investigation, studys_list, assay_dict, protocols)