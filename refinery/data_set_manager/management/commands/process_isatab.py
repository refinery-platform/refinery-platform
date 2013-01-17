from celery.task.sets import TaskSet, subtask
from data_set_manager.tasks import parse_isatab, create_dataset
from core.models import DataSet
from django.core.management.base import BaseCommand, CommandError
from optparse import make_option
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
    help = "%s <isatab directory or file> [--base_pre_isa_dir" % help
    help = "%s <base pre-isatab directory or file> --public" % help
    help = "%s --file_base_path <base path if file locations are relative>]\n" % help
    
    option_list = BaseCommand.option_list + (
                make_option('--base_pre_isa_dir',
                            action='store',
                            type='string'
                            ),
                make_option('--file_base_path',
                            action='store',
                            type='string',
                            default=None
                            ),
                make_option('--public',
                            action='store_true',
                            default=False
                            ),
                )

    """
    Name: handle
    Description:
        main program; calls the parsing and insertion functions
    """
    _username = None
    _additional_raw_data_file_extension = None   
    
    def __init__(self, filename=None):
        super( Command, self ).__init__()
    
       
    def handle(self, username, base_isa_dir, **options):
        try:
            self._username = username
        except:
            raise CommandError(self.help) 


        """get a list of all the isatab files in base_isa_dir"""
        isatab_dict = dict()
        for dirname, dirnames, filenames in os.walk(base_isa_dir):
            for filename in filenames:
                isatab_dict[filename] = [os.path.join(dirname, filename)]

        """If isatab_dict is empty, then base_isa_dir is a file, not a directory"""
        if not isatab_dict:
            isatab_dict[base_isa_dir] = [base_isa_dir]
        
        """get a list of all the isatab files in base_pre_isa_dir"""
        pre_isatab_files = 0
        try:
            for dirname, dirnames, filenames in os.walk(options['base_pre_isa_dir']):
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
        if options['base_pre_isa_dir'] and not pre_isatab_files:
            isatab_dict[base_isa_dir].append(options['base_pre_isa_dir'])

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
                                                  options['public'],
                                                  isa_file, 
                                                  self._additional_raw_data_file_extension, 
                                                  isa_file, pre_file,
                                                  options['file_base_path']
                                                  )
                                            )
            s_tasks.append(sub_task)


        job = TaskSet(tasks=s_tasks)
        result = job.apply_async()
        
        for i in result.iterate():
            try:
                ds = DataSet.objects.get(uuid=i)
                inv = ds.get_investigation()
                print "Successfully parsed %s into DataSet" % inv.get_identifier(),
                print "with UUID %s" % i
                sys.stdout.flush()
            except:
                print "Unsuccessful parse and DataSet Creation of %s." % i
                sys.stdout.flush()
            