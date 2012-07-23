from celery.task.sets import TaskSet, subtask
from data_set_manager.tasks import parse_isatab, create_dataset
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
    help = "%s<base_pre_isatab_directory> is_public=True]\n" % help

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
            self.logger.info("ERROR: Insufficient arguments; see description and usage")
            self.logger.info(" below.\n")
            self.logger.info(self.help)
            sys.exit()
        
        self._username = args[0]
        base_isa_dir = args[1]
        
        opt = {'base_pre_isa_dir': None, 'is_public': False}
        """assign base_pre_isa_dir and is_public values"""
        for arg in args:
            """split on "="s or ignore it"""
            try:
                split_arg = string.split(arg, '=')
                opt[split_arg[0]] = split_arg[1]
            except:
                pass

        """get a list of all the isatab files in base_isa_dir"""
        isatab_files = list()
        for dirname, dirnames, filenames in os.walk(base_isa_dir):
            for filename in filenames:
                isatab_files.append(os.path.join(dirname, filename))
        
        """
        If isatab_files() is empty, then base_isa_dir is a file, not a
        directory
        """
        if isatab_files:
            isatab_files.append(base_isa_dir)
        
        """get a list of all the isatab files in base_pre_isa_dir"""
        pre_isatab_files = list()
        try:
            for dirname, dirnames, filenames in os.walk(opt['base_pre_isa_dir']):
                for filename in filenames:
                    pre_isatab_files.append(os.path.join(dirname, filename))
        except:
            pass
        
        """
        If base_pre_isa_dir is defined but pre_isatab_files is empty,
        then base_pre_isa_dir is a pre-ISA-Tab archive, not a directory
        """
        if opt['base_pre_isa_dir'] and not pre_isatab_files:
            pre_isatab_files.append(opt['base_pre_isa_dir'])

        s_tasks = list()
        """add subtasks to list"""
        if pre_isatab_files: #have both isatab and pre-isatab files
            for i, p in zip(isatab_files, pre_isatab_files):
                sub_task = parse_isatab.subtask(args=(self._username,
                                                      opt['is_public'],
                                                      i, 
                                                      self._additional_raw_data_file_extension, 
                                                      i, p))
                s_tasks.append(sub_task)
        else: #have only isatab files
            for i in isatab_files:
                sub_task = parse_isatab.subtask(args=(self._username, 
                                                      opt['is_public'], 
                                                      i, 
                                                      self._additional_raw_data_file_extension))
                s_tasks.append(sub_task)

        job = TaskSet(tasks=s_tasks)
        result = job.apply_async()
        while result.waiting():
            print "parsing..."
            time.sleep(3)
        results = result.join()