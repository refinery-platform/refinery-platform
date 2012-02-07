from django.core.management.base import LabelCommand
from django.db import transaction
from refinery.isa_tab.models import *
import csv, sys, re, string, os, glob
from collections import defaultdict

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
            #return the sub-type
            return field[left_bracket+1:right_bracket].upper()
    
        """
        Name: insert_subtype
        Description:
            inserts the sub-type from the Characteristic or Factor Value
            header into a Django model
        Parameters:
            subtypes: an array of all the sub-types that need to be inserted 
        """
        def insert_subtype(subtypes):
            s = Sub_Type(type=subtypes)
            s.save()
    
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
                           'tor': [], #short for investigator
                           'tion': {} #short for investigation
                           }
            #read in investigation file
            file_reader = open(i_file, 'rb')
            #grab the investigation file values
            for row in file_reader:
                if re.search(r'Study Identifier', row):
                    #grab accession number
                    split = string.split(row, '\t')
                    invest_info['tion']['accession'] = string.strip(split[1])
                    #grab investigation title
                    row = file_reader.next()
                    split = string.split(row, '\t')
                    invest_info['tion']['title'] = string.strip(split[1])
                elif re.search(r'Study Description', row):
                    #get study description
                    split = string.split(row, '\t')
                    invest_info['tion']['description'] = string.strip(split[1])
                elif re.search(r'Study Person Last Name', row): #investigator contact
                    split = string.split(row, '\t')
                    #get last names of investigators
                    last = split[1:]
                    row = file_reader.next()
                    #get first names of investigators
                    split = string.split(row, '\t')
                    first = split[1:]
                    row = file_reader.next()
                    #get middle initials of investigators
                    split = string.split(row, '\t')
                    mid = split[1:]
                    row = file_reader.next()
                    #emails of investigators (determines if name goes in database)
                    split = string.split(row, '\t')
                    email = split[1:]
                
                    file_reader.next()
                    file_reader.next()
                    file_reader.next()
                    row = file_reader.next()
                
                    #get affiliation
                    split = string.split(row, '\t')
                    aff = split[1:]
                                
                    for i, e in enumerate(email):
                        if not re.search(r'^\s*$', e):
                            dictionary = dict()
                            dictionary['email'] = string.strip(e)
                            dictionary['first_name'] = string.strip(first[i])
                            dictionary['last_name'] = string.strip(last[i])
                            dictionary['mid_initial'] = string.strip(mid[i])
                            dictionary['affiliation'] = string.strip(aff[i])
                            
                            #append investigator dictionary to info list
                            invest_info['tor'].append(dictionary)
                    
            return invest_info
    
        """
        Name: insert_investigation
        Description:
            inserts investigation information & investigator information
        Parameters:
            i_dict: dictionary of investigation file
        """
        def insert_investigation(i_dict):
            tor_list = i_dict['tor'] #investigator
            tion_dict = i_dict['tion'] #investigation
            
            # "**" converts dictionary to arguments
            investigation = Investigation(**tion_dict)
            investigation.save()
            
            #add investigation to tor dictionary and insert investigator(s)
            with transaction.commit_on_success():
                for tor_dict in tor_list:
                    investigator = Investigator(**tor_dict)
                    investigator.save()

                    #add investigation to investigator
                    investigator.investigations.add(investigation)

            return investigation
            #print i_dict
    
        """
        Name: parse_study_file
        Description:
            parse the fields relevant to our Django model and put them into a
            dictionary
        Parameters:
            s_file: path to study file
        """
        def parse_study_file(s_file):
            study_info = defaultdict(dict)
            #read in study file
            file_reader = csv.DictReader(open(s_file, 'rb'), 
                                         dialect='excel-tab')
    
            #iterate over the file
            for row in file_reader:
                dictionary = dict()
                #each row is a dictionary, so iterate over that
                for head, field in row.items():
                    if re.search(r"Characteristic", head):
                        key = get_subtype(head)
                        insert_subtype(key)
                        dictionary[key] = field
                
                #assign so dictionary of dictionaries with name as first key
                study_info[row['Sample Name']] = dictionary
    
            return study_info
    
        """
        Name: parse_assay_file
        Description:
            parse the fields relevant to our Django model and put them into a
            dictionary
        Parameters:
            a_file: path to assay file
        """
        def parse_assay_file(a_file):
            assay_info = defaultdict(dict)
            #read in assay file, can't use dictionary because keys may be 
            #potentially overwritten
            file_reader = csv.reader(open(a_file, 'rb'), dialect='excel-tab')
            #grab the assay file values (i.e. the factor values, the sample 
            #name, and the file URLs)
            #grab the first line (which is header)
            header = file_reader.next()
    
            #find out where all the relevant fields are
            head = {
                    0: 'name' #Sample name is always the first index
            }
            for index, field in enumerate(header): #iterate over to get 
                if re.search(r'Factor Value', field):
                    subtype = get_subtype(field)
                    head[index] = subtype
                    insert_subtype(subtype)
                elif re.search(r'Derived ArrayExpress FTP file', field):
                    head[index] = 'processed_data'
                elif re.search(r'FASTQ URI', field):
                    head[index] = 'raw_data'
                elif re.search(r'Raw Data File', field):
                    head[index] = 'raw_data'
    
            #grab the contents of those columns and put them into assay_info
            for row in file_reader:
                name = ''
                for i, field in enumerate(row):
                    if i in head:
                        if i == 0:
                            name = field
                            assay_info[name]['raw_data'] = list()
                            assay_info[name]['processed_data'] = list()
                            assay_info[name]['factor_value'] = dict()

                        #if a Factor Value[*]
                        elif head[i]!='raw_data' and head[i]!='processed_data':
                            assay_info[name]['factor_value'][head[i]] = field
                        else:
                            assay_info[name][head[i]].append(field)
    
            return assay_info
    
        """
        Name: insert_assay
        Description:
            insert study and assay information
        Parameters:
            s_dict: dictionary of study file
            a_dict: dictionary of assay file
        """
        def insert_assay(investigation, s_dict, a_dict):
            for name in a_dict.keys():
                #insert the Raw and Processed Data first
                raw_list = a_dict[name]['raw_data']
                raw_obj_list = list()
                with transaction.commit_on_success(): #commit when all finished
                    for i in raw_list:
                        r = Raw_Data(url=i)
                        r.save()
                        raw_obj_list.append(r)

                processed_list = a_dict[name]['processed_data']
                processed_obj_list = list()
                with transaction.commit_on_success():
                    for i in processed_list:
                        p = Processed_Data(url=i)
                        p.save()
                        processed_obj_list.append(p)

                #then the assay
                a = Assay(name=name, investigation=investigation)
                a.save()
                
                #link raw files
                for i in raw_obj_list:
                    a.raw_data.add(i)
                
                #link processed files
                for i in processed_obj_list:
                    a.processed_data.add(i)

                #then the factor values
                try:
                    with transaction.commit_on_success():
                        for k, v in a_dict[name]['factor_value'].items():
                            subtype = Sub_Type.objects.get(pk=k) #grab sub-type
                            f = Factor_Value(value=v, type=subtype, assay=a)
                            f.save()
                except Exception:
                    pass
                
                #and finally characteristics
                try:
                    with transaction.commit_on_success():
                        for k, v in s_dict[name].items():
                            subtype = Sub_Type.objects.get(pk=k)
                            c = Characteristic(value=v, type=subtype, assay=a)
                            c.save()
                except Exception:
                    pass


        """ main program starts """
        base_dir = "/Users/psalmhaseley/Documents/isa-tab/cnvrt"
        isa_ref = label
        
        isa_dir = os.path.join(base_dir, isa_ref)
        
        assert os.path.isdir(isa_dir), "Invalid Accession: %s" % isa_ref

        #assign files to proper file locations and make sure they're correct    
        investigation_file = "%s/i_%s_investigation.txt" % (isa_dir, isa_ref)
        assert os.path.exists(investigation_file), "%s" % investigation_file
        
        study_file = "%s/s_%s_studysample.txt" % (isa_dir, isa_ref)
        assert os.path.exists(study_file), "Not study file %s" % study_file
        
        assay_file = "%s/a_%s_assay.txt" % (isa_dir, isa_ref)
        assert os.path.exists(assay_file), "Not assay file %s" % assay_file

        investigation_dict = parse_investigation_file(investigation_file)
        investigation = insert_investigation(investigation_dict)

        study_dict = parse_study_file(study_file)
    
        assay_dict = parse_assay_file(assay_file)
        insert_assay(investigation, study_dict, assay_dict)