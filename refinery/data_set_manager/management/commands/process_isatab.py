from django.core.management.base import BaseCommand, CommandError
import os, re, time, sys, string
from data_set_manager.tasks import parse_isatab, create_dataset 
from celery.task.sets import TaskSet, subtask

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
    def handle(self, *args, **options):
        """parse arguments"""
        if len(args) < 2:
            print "ERROR: Insufficient arguments; see description and usage",
            print "below."
            print self.help
            sys.exit()
        
        username = args[0]
        base_isa_dir = args[1]
        
        opt = {'base_pre_isa_dir': None, 'is_public': False}
        for arg in args:
            try:
                split_arg = string.split(arg, '=')
                opt[split_arg[0]] = split_arg[1]
            except:
                pass

        isatab_files = list()
        for dirname, dirnames, filenames in os.walk(base_isa_dir):
            for filename in filenames:
                isatab_files.append(os.path.join(dirname, filename))
        
        pre_isatab_files = list()
        try:
            for dirname, dirnames, filenames in os.walk(opt['base_pre_isa_dir']):
                for filename in filenames:
                    pre_isatab_files.append(os.path.join(dirname, filename))
        except:
            pass

        s_tasks = list()
        if pre_isatab_files:
            for i, p in zip(isatab_files, pre_isatab_files):
                sub_task = parse_isatab.subtask(args=(username,
                                                      opt['is_public'],
                                                      i, i, p))
                s_tasks.append(sub_task)
        else:
            for i in isatab_files:
                sub_task = parse_isatab.subtask(args=(username, 
                                                      opt['is_public'], 
                                                      i))
                s_tasks.append(sub_task)

        job = TaskSet(tasks=s_tasks)
        result = job.apply_async()
        while result.waiting():
            print "processing..."
            time.sleep(3)
        results = result.join()