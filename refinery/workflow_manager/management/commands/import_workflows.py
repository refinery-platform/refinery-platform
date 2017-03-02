from __future__ import absolute_import

from django.core.management.base import BaseCommand

from ...tasks import get_workflows
from core.models import WorkflowEngine


class Command(BaseCommand):
    help = "Import workflows from all registered workflow engines and " \
           "make them public."

    def handle(self, **options):
        workflow_engines = WorkflowEngine.objects.all()
        workflows = 0
        self.stdout.write("%d workflow engines found" %
                          workflow_engines.count())
        for engine in workflow_engines:
            self.stdout.write("Importing from workflow engine '%s' ..." %
                              engine.name)
            old_workflow_count = engine.workflow_set.all().count()
            engine_issues = get_workflows(engine)
            if len(engine_issues) > 0:
                self.stdout.write("\n".join(engine_issues))
            new_workflow_count = engine.workflow_set.all().count()
            self.stdout.write(
                "%d workflows imported from engine '%s'..." %
                (new_workflow_count-old_workflow_count, engine.name))
            workflows += new_workflow_count - old_workflow_count
        self.stdout.write("%d workflows imported from %d workflow engines" %
                          (workflows, workflow_engines.count()))
