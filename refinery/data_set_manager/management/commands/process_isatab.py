from django.core.management.base import BaseCommand, CommandError
import os, re, time
from data_set_manager.tasks import parse_isatab, create_dataset 
from celery.task.sets import TaskSet, subtask

class Command(BaseCommand):
    help = "Takes the directory of an ISA-Tab file as input, parses, and"
    help = "%s inputs it into the database" % help


    """
    Name: handle
    Description:
        main program; calls the parsing and insertion functions
    """   
    def handle(self, username, base_isa_dir, base_pre_isa_dir=None, **options):
        print "base_isa_dir:",
        print base_isa_dir
        print "pre_isa_dir:",
        print base_pre_isa_dir
        isatab_files = list()
        for dirname, dirnames, filenames in os.walk(base_isa_dir):
            for filename in filenames:
                isatab_files.append(os.path.join(dirname, filename))
                
        print isatab_files
        
        pre_isatab_files = list()
        try:
            for dirname, dirnames, filenames in os.walk(base_pre_isa_dir):
                for filename in filenames:
                    pre_isatab_files.append(os.path.join(dirname, filename))
        except:
            pass
        
        print pre_isatab_files
        
        print isatab_files
        print pre_isatab_files
        s_tasks = list()
        if pre_isatab_files:
            for i, p in zip(isatab_files, pre_isatab_files):
                print i
                print p
                sub_task = parse_isatab.subtask(args=(i, i, p))
                s_tasks.append(sub_task)
        else:
            for i in isatab_files:
                sub_task = parse_isatab.subtask(args=(i,),)
                s_tasks.append(sub_task)

        job = TaskSet(tasks=s_tasks)
        result = job.apply_async()
        while result.waiting():
            print 'sleeping'
            time.sleep(3)
        results = result.join()
        
        for r in results:
            if r:
                create_dataset(r, username)