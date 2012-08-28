from celery.task.sets import TaskSet, subtask
from data_set_manager.tasks import parse_isatab, create_dataset
from core.models import DataSet
from django.core.management.base import BaseCommand, CommandError
import os
import re
import time
import sys
import string
import logging

# get module logger
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Takes the directory of an ISA-Tab file as input, parses, and"
    help = "%s inputs it into the database\n" % help
    help = "%s\nUsage: python manage.py process_isatab <username>" % help
    help = "%s <base_isatab_directory> [base_pre_isa_dir=" % help
    help = "%s<base_pre_isatab_directory> is_public=True " % help
    help = "%sfile_base_path=<base path if file locations are " % help
    help = "%srelative>]\n" % help

    """
    Name: handle
    Description:
        main program; calls the parsing and insertion functions
    """
    _username = None
    _additional_raw_data_file_extension = None   
    
    def __init__(self, filename=None):
        super( Command, self ).__init__()
    
       
    def handle(self, *args, **options):
        """parse arguments"""
        if len(args) < 2:
            logger.info("ERROR: Insufficient arguments; see description and usage")
            logger.info(" below before trying again.\n")
            logger.info(self.help)
            sys.exit()
        
        self._username = args[0]
        base_isa_dir = args[1]
        
        opt = {'base_pre_isa_dir': None,
               'is_public': False,
               'file_base_path': None
              }

        """assign base_pre_isa_dir and is_public values"""
        for arg in args:
            """split on "="s or ignore it"""
            try:
                split_arg = string.split(arg, '=')
                opt[split_arg[0]] = split_arg[1]
            except:
                pass

        """get a list of all the isatab files in base_isa_dir"""
        isatab_dict = dict()
        for dirname, dirnames, filenames in os.walk(base_isa_dir):
            for filename in filenames:
                isatab_dict[filename] = [os.path.join(dirname, filename)]

        """
        If isatab_dict is empty, then base_isa_dir is a file, not a directory
        """
        if not isatab_dict:
            isatab_dict[base_isa_dir] = [base_isa_dir]
        
        """get a list of all the isatab files in base_pre_isa_dir"""
        pre_isatab_files = 0
        try:
            for dirname, dirnames, filenames in os.walk(opt['base_pre_isa_dir']):
                for filename in filenames:
                    """associate pre-isatab file with isatab file"""
                    for key in isatab_dict:
                        if re.search(r'%s$' % key, filename):
                            file = os.path.join(dirname, filename)
                            isatab_dict[key].append(file)
                            pre_isatab_files += 1
                            break
        except:
            pass
        
        """
        If base_pre_isa_dir is defined but pre_isatab_files is 0,
        then base_pre_isa_dir is a pre-ISA-Tab archive, not a directory
        """
        if opt['base_pre_isa_dir'] and not pre_isatab_files:
            isatab_dict[base_isa_dir].append(opt['base_pre_isa_dir'])

        s_tasks = list()
        """add subtasks to list"""
        for k, v_list in isatab_dict.items():
            isa_file = v_list.pop(0)
            try:
                pre_file = v_list.pop(0)
            except:
                pre_file = None

            sub_task = parse_isatab.subtask(args=(
                                                  self._username,
                                                  opt['is_public'],
                                                  isa_file, 
                                                  self._additional_raw_data_file_extension, 
                                                  isa_file, pre_file,
                                                  opt['file_base_path']
                                                  )
                                            )
            s_tasks.append(sub_task)


        job = TaskSet(tasks=s_tasks)
        result = job.apply_async()
        
        for i in result.iterate():
            if i:
                ds = DataSet.objects.get(uuid=i)
                inv = ds.get_investigation()
                print "Successfully parsed %s into DataSet" % inv.get_identifier(),
                print "with UUID %s" % i
            else:
                print "Unsuccessful parse and DataSet Creation of %s" % inv.get_identifier() 