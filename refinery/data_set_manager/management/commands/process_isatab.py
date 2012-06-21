from django.core.management.base import BaseCommand, CommandError
import os, re
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
    def handle(self, base_isa_dir, base_pre_isa_dir=None, username):
        isatab_files = os.walk(base_isa_dir)
        pre_isatab_files = os.walk(base_pre_isa_dir)
        
        s_tasks = list()
        for i, p in zip(isatab_files, pre_isatab_files):
            sub_task = parse_isatab.subtask(args=(i, i, p))
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