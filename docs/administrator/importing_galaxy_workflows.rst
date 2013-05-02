.. _importing_galaxy_workflows:

Importing Galaxy Workflows into Refinery
========================================

Before you can import *Workflows* from a Galaxy installation into Refinery, the
following requirements have to be met:

* you have to add a *Galaxy Instance* for the Galaxy installation in question to Refinery
* you have to create a *Workflow Engine* for this *Galaxy Instance*
* you have to :ref:`annotate <preparing_galaxy_workflows>` all workflows in the Galaxy installation that you want to import  

Once these requirements have been met, run the ``import_workflows`` command:

>>> python manage.py import_workflows

This command will attempt to import *Workflows* from all *Workflow Engines* registered in your Refinery server.
All Galaxy workflows that are annotated as Refinery *Workflows* will be parsed and imported if annotated correctly. Annotation
errors will be reported, as well as the total number of *Workflows* imported from each *Workflow Engine*.

Existing *Workflows* in your Refinery server will be deactivated but not deleted. Deactivated workflows can no 
longer be executed but their information can be accessed through the *Analyses* in which they were run.