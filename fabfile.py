"""
Deployment script for the Refinery Platform software environment

Requirements:
* ~/.fabricrc (see fabricrc.sample for details):
* deployment_base_dir on the remote hosts must be owned by project_user
* project_user home dir must exist
* local user account running this script must be able to:
** run commands as root on target hosts using sudo
** SSH in to the target hosts as project_user
** access Refinery Github account using an SSH key

"""

import os
from fabric.api import settings, run, env, sudo, execute
from fabric.context_managers import hide, prefix, cd
from fabric.decorators import task, with_settings
from fabric.operations import require
from fabric.utils import puts
from fabtools.vagrant import vagrant


# Fabric settings
env.forward_agent = True    # for Github operations


def setup():
    """Check if the required variable were initialized in ~/.fabricrc"""
    require("project_user", "refinery_project_dir", "refinery_virtualenv_name")
    env.refinery_app_dir = os.path.join(env.refinery_project_dir, "refinery")


@task
def vm():
    """Configure environment for deployment on Vagrant VM"""
    env.project_user = "vagrant"    # since it's used as arg for decorators
    env.refinery_project_dir = "/vagrant"
    env.refinery_virtual_env_name = "refinery-platform"
    env.grunt = "grunt build"
    setup()
    execute(vagrant)


@task
def dev():
    """Set config for deployment on development VM"""
    setup()
    env.hosts = [env.dev_host]
    env.grunt = "grunt build"


@task
def stage():
    """Set config for deployment on staging VM"""
    setup()
    env.hosts = [env.stage_host]
    env.grunt = "grunt compile"


@task
def prod():
    """Set config for deployment on production VM"""
    #TODO: add a warning message/confirmation about updating production VM?
    setup()
    env.hosts = [env.prod_host]
    env.grunt = "grunt compile"


@task(alias="update")
@with_settings(user=env.project_user)
def update_refinery():
    """Perform full update of a Refinery Platform instance"""
    puts("Updating Refinery")
    with cd(env.refinery_project_dir):
        run("git pull")
    with cd(os.path.join(env.refinery_app_dir, "ui")):
        run("npm prune && npm update")
        run("bower prune && bower update --config.interactive=false")
        run("{grunt}".format(**env))
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        run("pip install -r {refinery_project_dir}/requirements.txt".format(**env))
        run("find . -name '*.pyc' -delete")
        run("{refinery_app_dir}/manage.py syncdb --migrate".format(**env))
        run("{refinery_app_dir}/manage.py collectstatic --clear --noinput".format(**env))
        run("supervisorctl reload")
    with cd(os.path.join(env.refinery_project_dir)):
        run("touch {refinery_app_dir}/wsgi.py".format(**env))


@task(alias="relaunch")
@with_settings(user=env.project_user)
def relaunch_refinery(dependencies=False, migrations=False):
    """Perform a relaunch of a Refinery Platform instance, including processing of grunt tasks
        dependencies: update bower and pip dependencies
        migrations: apply migrations
    """
    puts("Relaunching Refinery")
    with cd(os.path.join(env.refinery_app_dir, "ui")):
        if dependencies:
            run("bower update --config.interactive=false")
        run("grunt")
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        if dependencies:
            run("pip install -r {refinery_project_dir}/requirements.txt".format(**env))

        run("find . -name '*.pyc' -delete")

        if migrations:
            run("{refinery_app_dir}/manage.py syncdb --migrate".format(**env))
        run("{refinery_app_dir}/manage.py collectstatic --noinput".format(**env))
        run("supervisorctl restart all")
    with cd(os.path.join(env.refinery_project_dir)):
        run("touch {refinery_app_dir}/wsgi.py".format(**env))
