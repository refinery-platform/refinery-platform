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

from fabric.api import env, execute, run, sudo
from fabric.context_managers import cd, prefix, shell_env
from fabric.contrib.files import sed
from fabric.decorators import task, with_settings
from fabric.operations import require
from fabric.utils import abort, puts
from fabtools.vagrant import vagrant

# Fabric settings
env.forward_agent = True    # for Github operations


def setup():
    """Check if the required variable were initialized in ~/.fabricrc"""
    require("project_user", "refinery_project_dir", "refinery_virtualenv_name")
    env.refinery_app_dir = os.path.join(env.refinery_project_dir, "refinery")
    env.refinery_ui_dir = os.path.join(env.refinery_app_dir, "ui")


@task
def vm():
    """Configure environment for deployment on Vagrant VM"""
    env.project_user = "vagrant"    # since it's used as arg for decorators
    env.refinery_project_dir = "/vagrant"
    env.refinery_virtual_env_name = "refinery-platform"
    setup()
    execute(vagrant)


@task
def dev():
    """Set config for deployment on development VM"""
    setup()
    require("dev_host", "dev_branch")
    env.hosts = [env.dev_host]
    env.branch = env.dev_branch


@task
def test():
    """Set config for deployment on testing VM"""
    require("test_host", "test_branch")
    setup()
    env.hosts = [env.test_host]
    env.branch = env.test_branch


@task
def prod():
    """Set config for deployment on production VM"""
    # TODO: add a warning message/confirmation about updating production VM?
    setup()
    require("prod_host", "prod_branch")
    env.hosts = [env.prod_host]
    env.branch = env.prod_branch


@task
@with_settings(user=env.project_user)
def conf(mode=None):
    """Switch Refinery configurations on Vagrant VM"""
    if (mode is None) or (env.hosts != ['vagrant@127.0.0.1:2222']):
        abort("usage: fab vm conf:<mode>")
    modes = ['dev', 'djdt', 'gdev', 'prod']
    if mode not in modes:
        abort("Mode must be one of {}".format(modes))
    puts("Switching Refinery running on Vagrant VM to '{}' mode".format(mode))
    env.shell_before = "export DJANGO_SETTINGS_MODULE=config.settings.*"
    env.shell_after = \
        "export DJANGO_SETTINGS_MODULE=config.settings.{}".format(mode)
    env.apache_before = "WSGIScriptAlias .*"
    env.apache_after = "WSGIScriptAlias / {}/config/wsgi_{}.py".format(
        env.refinery_app_dir, mode)

    # stop supervisord and Apache
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        run("supervisorctl shutdown")
    sudo("/usr/sbin/service apache2 stop")
    # update DJANGO_SETTINGS_MODULE
    home_dir = run("echo ~", quiet=True)
    sed("{}/.profile".format(home_dir), before=env.shell_before,
        after=env.shell_after, backup='')
    # update WSGIScriptAlias value
    sed('/etc/apache2/sites-available/25-refinery.conf',
        before=env.apache_before, after=env.apache_after, backup='',
        use_sudo=True)
    # update static files
    with cd(env.refinery_ui_dir):
        run("grunt make")
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        run("{refinery_app_dir}/manage.py collectstatic --clear --noinput"
            .format(**env))
    # start supervisord and Apache
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        run("supervisord")
    sudo("/usr/sbin/service apache2 start")


@task(alias="update")
@with_settings(user=env.project_user)
def update_refinery():
    """Perform full update of a Refinery Platform instance"""
    puts("Updating Refinery")
    with cd(env.refinery_project_dir):
        # if in Vagrant update current branch, otherwise checkout custom branch
        if env.project_user != 'vagrant':
            run("git checkout {branch}".format(**env))
        # avoid explaining automatic merge commits with both new and old git
        # versions running on different VMs
        # https://raw.githubusercontent.com/gitster/git/master/Documentation/RelNotes/1.7.10.txt
        with shell_env(GIT_MERGE_AUTOEDIT='no'):
            run("git pull".format(**env))
    with cd(env.refinery_ui_dir):
        run("npm prune --progress false")
        run("npm update --progress false")
        run("rm -rf bower_components")
        run("bower update --config.interactive=false")
        run("grunt make")
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        run("pip install -r {refinery_project_dir}/requirements.txt"
            .format(**env))
        run("find . -name '*.pyc' -delete")
        run("{refinery_app_dir}/manage.py migrate --noinput --fake-initial"
            .format(**env))
        run("{refinery_app_dir}/manage.py collectstatic --clear --noinput"
            .format(**env))
        run("supervisorctl reload")
    with cd(env.refinery_project_dir):
        run("touch {refinery_app_dir}/config/wsgi_*.py".format(**env))


@task(alias="relaunch")
@with_settings(user=env.project_user)
def relaunch_refinery(dependencies=False, migrations=False):
    """Perform a relaunch of a Refinery Platform instance, including processing
    of grunt tasks
    dependencies: update bower and pip dependencies
    migrations: apply migrations
    """
    puts("Relaunching Refinery")
    with cd(os.path.join(env.refinery_app_dir, "ui")):
        if dependencies:
            run("bower update --config.interactive=false")
        run("grunt make")
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        if dependencies:
            run("pip install -r {refinery_project_dir}/requirements.txt"
                .format(**env))
        run("find . -name '*.pyc' -delete")
        if migrations:
            run("{refinery_app_dir}/manage.py migrate --noinput "
                "--fake-initial".format(**env))
        run("{refinery_app_dir}/manage.py collectstatic --noinput"
            .format(**env))
        run("supervisorctl restart all")
    with cd(env.refinery_project_dir):
        run("touch {refinery_app_dir}/config/wsgi_*.py".format(**env))
