'''
Created on Oct 24, 2012

@author: Ilya Sytchev

Deployment script for the Stem Cell Commons software environment

OS: CentOS 5.7

Requirements:
* scc_base_dir must be:
** owned by 'scc_user' and 'scc_group'
** group writeable and gid bit must be set
* local user account running this script must be able:
** to run commands as root on target hosts using sudo
** to access Refinery Github account using an SSH key
* local current directory must contain the following templates:
** bash_profile_template
** bashrc_template
** settings_local_*.py
* following local shell vars must be set: SCC_BASE_DIR, SCC_USER, SCC_GROUP

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
env.django_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(env.django_root)
from django.conf import settings as django_settings  # to avoid conflict with fabric.api.settings

# remote settings
env.scc_base_dir = os.environ['SCC_BASE_DIR']
env.scc_user = os.environ['SCC_USER']
env.scc_group = os.environ['SCC_GROUP']

# Bash config
env.bash_profile_path = os.path.join(env.django_root, "bash_profile_template")
env.bashrc_path = os.path.join(env.django_root, "bashrc_template")

# Fabric settings
env.forward_agent = True    # for Github operations

@task
def dev():
    '''Set config to development mode

    '''
    #TODO: check that scc_* vars contain reasonable values
    # remote settings 
    env.hosts = ['scc-dev.rc.fas.harvard.edu']
    env.scc_target_dir = env.scc_base_dir + 'dev'
    # local settings
    dev_settings = 'settings_local_dev'
    django.settings_module(dev_settings)
    env.django_settings_path = os.path.join(env.django_root, dev_settings + '.py')

@task
def stage():
    '''Set config to staging mode

    '''
    #TODO: implement using dev() as a template

@task
def bootstrap():
    '''Initialize the target VM from the default state

    '''
    # check prerequisites
    #TODO: check if all required env vars are set?
    check_scc_user()
    check_scc_base_dir()

    create_scc_target_dir()
    create_scc_home_dir()
    init_scc_home_dir()

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
@with_settings(user=env.scc_user)
def check_scc_user():
    '''Check if we can log in as 'scc_user'

    '''
    puts("Checking if we can login as '{scc_user}' user".format(**env))
    with settings(hide('commands')):
        run("whoami")
    puts("OK")

@task
@with_settings(user=env.scc_user)
def check_scc_base_dir():
    '''Check if base directory exists

    '''
    puts("Checking if base directory exists at '{scc_base_dir}'".format(**env))
    if not exists(env.scc_base_dir):
        abort("'{scc_base_dir}' does not exist".format(**env))
    puts("OK")

@task
@with_settings(user=env.scc_user)
def create_scc_target_dir():
    '''Create target directory for deployment if doesn't exist

    '''
    puts("Creating target directory for deployment at '{scc_target_dir}'".format(**env))
    with settings(warn_only=True):
        if exists(env.scc_target_dir):
            puts("'{scc_target_dir}' exists".format(**env))
            return
    run("mkdir {'scc_target_dir}'".format(**env))

@task
def create_scc_home_dir():
    '''Create home directory for scc_user
    (no access to the NFS-mounted home directories from the VMs at FAS RC)

    '''
    puts("Creating home directory for the '{scc_user}' user".format(**env))
    with hide('commands'):
        home_dir = run("echo ~{}".format(env.scc_user))
    if exists(home_dir):
        puts("Home directory for '{}' user already exists at '{}'".format(env.scc_user, home_dir))
        return
    sudo("mkdir {}".format(home_dir))
    sudo("chown {}:{} {}".format(env.scc_user, env.scc_group, home_dir))

@task
@with_settings(user=env.scc_user)
def init_scc_home_dir():
    '''Create .bashrc and .bash_profile using templates and upload to $HOME of scc_user

    '''
    upload_template(env.bash_profile_path, "~/.bash_profile")
    bashrc_context = {'scc_target_dir': env.scc_target_dir}
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
    '''Configure RabbitMQ

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
    #TODO: start_rabbitmq()?
    puts("Configuring RabbitMQ")
    # create user unless it already exists
    with settings(hide('commands'), warn_only=True):
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
@with_settings(user=env.scc_user)
def create_virtualenv(env_name):
    '''Create a virtual environment using provided name

    '''
    run("mkvirtualenv {}".format(env_name))

@task
@with_settings(user=env.scc_user)
def clone_refinery(branch):
    '''Clone the development branch of the Refinery repository to create a new virtualenv project

    '''
    puts("Cloning Refinery into a new virtual project")
    with hide('commands'):
        project_home = run("echo $PROJECT_HOME")
    if not project_home:
        abort("Missing $PROJECT_HOME")
    if not exists(project_home):
        run("mkdir {}".format(project_home))
    refinery_home = os.path.join(project_home, "Refinery")
    if exists(os.path.join(refinery_home, ".git")):
        puts("Git project already exists in '{}'".format(refinery_home))
    else:
        with cd(project_home):
            run("git clone -b {} git@github.com:parklab/Refinery.git".format(branch))
    # upload appropriate settings_local file
    upload_template(env.django_settings_path,
                    os.path.join(refinery_home, "refinery/settings_local.py"))
    # associate the new project with its virtual environment
    with prefix("workon refinery"):
        run("setvirtualenvproject $VIRTUAL_ENV {}".format(refinery_home))

@task
@with_settings(user=env.scc_user)
def configure_virtualenv(env_name):
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
def deploy_refinery():
    '''Install Refinery application from scratch

    '''
    create_virtualenv("refinery")
    clone_refinery("develop")
    configure_virtualenv("refinery")

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
