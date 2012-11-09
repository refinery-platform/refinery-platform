'''
Created on Oct 24, 2012

@author: Ilya Sytchev

Deployment script for the Refinery software environment

OS: CentOS 5.7

Requirements:
* ~/.fabricrc with project_user, project_group and deployment_base_dir variables
* local current directory with the following templates:
** bash_profile_template and bashrc_template
** settings_local_*.py
* deployment_base_dir must be:
** owned by project_user and project_group
** group writeable and guid bit must be set
* deployment_base_dir/'source' directory with Apache Solr package
* local user account running this script must be able:
** to run commands as root on target hosts using sudo
** SSH in to the target hosts as project_user
** to access Refinery Github account using an SSH key

'''

import os
import sys
from fabric.api import local, settings, abort, run, env, sudo
from fabric.contrib import django
from fabric.contrib.console import confirm
from fabric.context_managers import hide, cd, prefix
from fabric.contrib.files import exists, upload_template
from fabric.decorators import task, with_settings
from fabric.utils import puts


# get Django settings for Refinery
env.local_django_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(env.local_django_root)
from django.conf import settings as django_settings  # to avoid conflict with fabric.api.settings

# Bash config
env.bash_profile_path = os.path.join(env.local_django_root, "bash_profile_template")
env.bashrc_path = os.path.join(env.local_django_root, "bashrc_template")

# Fabric settings
env.forward_agent = True    # for Github operations


@task
def dev():
    '''Set config to development

    '''
    #TODO: check that scc_* vars contain reasonable values
    env.hosts = ["scc-dev.rc.fas.harvard.edu"]
    env.dev_settings_file = "settings_local_dev.py"
    django.settings_module(os.path.splitext(env.dev_settings_file)[0])
    env.deployment_target_dir = os.path.join(env.deployment_base_dir, "dev")


@task
def stage():
    '''Set config to staging

    '''
    #TODO: implement using dev() as a template


@task
def prod():
    '''Set config to production

    '''
    #TODO: implement using stage() as a template


@task
def bootstrap():
    '''Initialize the target VM from the default state

    '''
    create_project_user_home_dir()
    create_deployment_target_dir()
    init_project_user_home_dir()

    install_postgresql_server()
    init_postgresql_server()
    install_postgresql_devel()

    install_git()

    install_rabbitmq()
    init_rabbitmq()
    start_rabbitmq()
    configure_rabbitmq()

    deploy_refinery()

    # init db

    # create users

    # init virtualenvs

    # install requirements


@task
def create_project_user_home_dir():
    '''Create home directory for project_user
    (no access to the NFS-mounted home directories from the VMs at FAS RC)

    '''
    puts("Logging in as user '{project_user}'".format(**env))
    with settings(hide('commands')):
        run("whoami")

    puts("Creating home directory for user '{project_user}'".format(**env))
    with hide('commands'):
        home_dir = run("echo ~{}".format(env.project_user))
    if not exists(home_dir):
        sudo("mkdir {}".format(home_dir))
        sudo("chown {}:{} {}".format(env.project_user, env.project_group, home_dir))
    else:
        puts("Home directory for user '{}' already exists at '{}'".format(env.project_user, home_dir))


@task
@with_settings(user=env.project_user)
def create_deployment_target_dir():
    '''Create target directory for deployment if doesn't exist

    '''
    puts("Checking if deployment base directory exists at '{deployment_base_dir}'".format(**env))
    if not exists(env.deployment_base_dir):
        abort("'{deployment_base_dir}' does not exist".format(**env))

    puts("Creating target directory for deployment at '{deployment_target_dir}'".format(**env))
    if not exists(env.deployment_target_dir):
        run("mkdir '{deployment_target_dir}'".format(**env))
    else:
        puts("'{deployment_target_dir}' already exists".format(**env))


@task
@with_settings(user=env.project_user)
def init_project_user_home_dir():
    '''Create .bashrc and .bash_profile using templates and upload to $HOME of project_user

    '''
    upload_template(env.bash_profile_path, "~/.bash_profile")
    bashrc_context = {'deployment_target_dir': env.deployment_target_dir}
    upload_template(env.bashrc_path, "~/.bashrc", bashrc_context)


@task
def install_postgresql_server():
    '''Install PostgreSQL server from the CentOS repository

    '''
    puts("Installing PostgreSQL server")
    sudo("yum -q -y install postgresql84-server")


@task
def init_postgresql_server():
    '''Configure PostgreSQL server to start automatically at boot time and create a new database cluster

    '''
    sudo("/sbin/chkconfig postgresql on")
    with settings(hide('warnings'), warn_only=True):
        # initdb command returns 1 if data directory is not empty
        sudo("/sbin/service postgresql initdb")


@task
def install_postgresql_devel():
    '''Install PostgreSQL development libraries from the CentOS repository
     (pg_config is required by psycopg2 module)

    '''
    puts("Installing PostgreSQL development libraries")
    sudo("yum -q -y install postgresql84-devel")


@task
def install_git():
    '''Install Git from the CentOS repository

    '''
    puts("Installing Git")
    sudo("yum -q -y install git")


@task
def install_rabbitmq():
    '''Install RabbitMQ server

    '''
    puts("Installing RabbitMQ server")
    sudo("yum -q -y install rabbitmq-server")


@task
def init_rabbitmq():
    '''Configure RabbitMQ to start at boot time

    '''
    sudo("/sbin/chkconfig rabbitmq-server on")


@task
def start_rabbitmq():
    '''Start RabbitMQ server

    '''
    # need to check if the server is running because
    # service command exits with non-zero status if it is
    with settings(hide('everything'), warn_only=True):
        result = sudo("/sbin/service rabbitmq-server status")
    if result.failed:
        sudo("/sbin/service rabbitmq-server start")
    else:
        puts("RabbitMQ is already running")


@task
def configure_rabbitmq():
    '''Add user and host to RabbitMQ server using credentials in settings_local_*.py

    '''
    puts("Configuring RabbitMQ")

    # create user unless it already exists
    with settings(hide('commands')):
        user_list = sudo("rabbitmqctl -q list_users")
    #TODO: change to check only the first column
    if django_settings.BROKER_USER not in user_list:
        sudo("rabbitmqctl add_user {} {}"
             .format(django_settings.BROKER_USER, django_settings.BROKER_PASSWORD))
    else:
        puts("User '{}' already exists".format(django_settings.BROKER_USER))

    # create host unless it already exists
    with settings(hide('commands'), warn_only=True):
        host_list = sudo("rabbitmqctl -q list_vhosts")
    if django_settings.BROKER_HOST not in host_list:
        sudo("rabbitmqctl add_vhost {}".format(django_settings.BROKER_HOST))
    else:
        puts("Host '{}' already exists".format(django_settings.BROKER_HOST))

    # set permissions for the user
    sudo("rabbitmqctl set_permissions -p {} {} '.*' '.*' '.*'"
         .format(django_settings.BROKER_HOST, django_settings.BROKER_USER))


@task
@with_settings(user=env.project_user)
def create_virtualenv(env_name):
    '''Create a virtual environment using provided name

    '''
    run("mkvirtualenv {}".format(env_name))


@task
@with_settings(user=env.project_user)
def clone_refinery(branch):
    '''Clone the specified branch of the Refinery repository and create a new virtualenv project

    '''
    puts("Cloning Refinery into a new virtual project")

    # check if PROJECT_HOME is defined and exists
    with hide('commands'):
        project_home = run("echo $PROJECT_HOME")
    if not project_home:
        abort("Missing $PROJECT_HOME")
    if not exists(project_home):
        run("mkdir {}".format(project_home))

    # clone Refinery from Github
    refinery_home = os.path.join(project_home, "Refinery")
    if exists(os.path.join(refinery_home, ".git")):
        puts("Git project already exists in '{}'".format(refinery_home))
    else:
        with cd(project_home):
            run("git clone -b {} git@github.com:parklab/Refinery.git".format(branch))

    # associate the new project with its virtual environment
    with prefix("workon refinery"):
        run("setvirtualenvproject $VIRTUAL_ENV {}".format(refinery_home))


@task
@with_settings(user=env.project_user)
def init_refinery():
    '''Upload appropriate settings_local file

    '''
    with prefix("workon refinery"), hide('commands'):
        refinery_home = run("pwd")
    django_settings_path = os.path.join(env.local_django_root, env.dev_settings_file)
    upload_template(django_settings_path, os.path.join(refinery_home, "refinery/settings_local.py"))


@task
@with_settings(user=env.project_user)
def update_refinery():
    '''Pull code updates from the Github Refinery repository

    '''
    puts("Updating Refinery")
    with prefix("workon refinery"):
        run("git pull")


@task
@with_settings(user=env.project_user)
def init_virtualenv(env_name):
    '''Install requirements for the associated project

    '''
    with prefix("workon {}".format(env_name)):
        run("pip install -U -r requirements.txt")


@task
@with_settings(shell="/bin/su postgres -c")  # we cannot execute commands with sudo as user postgres
def create_refinery_db_user():
    '''Create PostgreSQL user for Refinery

    '''
    # check if the user already exists
    with settings(hide('commands'), warn_only=True):
        user_list = sudo("psql -c 'SELECT usename FROM pg_user;' -t")
    if django_settings.DATABASES['default']['USER'] not in user_list:
        sudo("psql -c \"CREATE ROLE {USER} PASSWORD '{PASSWORD}' NOSUPERUSER CREATEDB NOCREATEROLE LOGIN;\""
             .format(**django_settings.DATABASES['default']))
    else:
        puts("PostgreSQL user '{USER}' already exists".format(**django_settings.DATABASES['default']))


@task
@with_settings(shell="/bin/su postgres -c")  # we cannot execute commands with sudo as user postgres
def create_refinery_db():
    '''Create PostgreSQL database for Refinery

    '''
    # check if the database already exists
    with settings(hide('commands'), warn_only=True):
        db_list = sudo("psql -c 'SELECT datname FROM pg_database WHERE datistemplate = false;' -t")
    if django_settings.DATABASES['default']['NAME'] not in db_list:
        sudo("createdb -O {USER} {NAME}".format(**django_settings.DATABASES['default']))
    else:
        puts("PostgreSQL database '{NAME}' already exists".format(**django_settings.DATABASES['default']))


@task
@with_settings(user=env.project_user)
def create_refinery_media_root():
    '''Create Refinery MEDIA_ROOT directory if doesn't exist

    '''
    puts("Creating MEDIA_ROOT directory '{}'".format(django_settings.MEDIA_ROOT))
    if not exists(django_settings.MEDIA_ROOT):
        run("mkdir '{}'".format(django_settings.MEDIA_ROOT))
    else:
        puts("'{}' already exists".format(django_settings.MEDIA_ROOT))


@task
@with_settings(user=env.project_user)
def create_refinery_file_store():
    '''Create Refinery file store directory if doesn't exist

    '''
    file_store_dir = os.path.join(django_settings.MEDIA_ROOT, django_settings.FILE_STORE_DIR)
    puts("Creating file store directory at '{}'".format(file_store_dir))
    if not exists(file_store_dir):
        run("mkdir '{}'".format(file_store_dir))
    else:
        puts("'{}' already exists".format(file_store_dir))


@task
def deploy_refinery():
    '''Install Refinery application from scratch

    '''
    create_virtualenv("refinery")
    clone_refinery("develop")
    init_virtualenv("refinery")
    init_refinery()
    create_refinery_db_user()
    create_refinery_db()
    create_refinery_media_root()
    create_refinery_file_store()


@task
def pull():
    local("git pull")

@task
def test():
    '''Run unit tests

    '''
    with settings(warn_only=True):
        result = local("./manage.py test", capture=True)
    if result.failed and not confirm("Tests failed. Continue anyway?"):
        abort("Aborting at user request")

@task
def commit():
    local("git add -p && git commit")   # both commands may require user input

@task
def push():
    local("git push")

@task
def prepare_deploy():
    #TODO: make sure we are in the right directory
    pull()
    test()
    commit()
    push()
