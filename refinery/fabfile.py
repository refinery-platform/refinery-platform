'''
Created on Oct 24, 2012

@author: Ilya Sytchev

Deployment script for the Refinery software environment

OS: CentOS 5.7

Requirements:
* ~/.fabricrc with the following variables:
** deployment_base_dir=<absolute path to the root of the Refinery deployment tree>
** project_user=<username of the Refinery user>
** project_group=<main group of the Refinery user>
** dev_hosts=<comma-separated list of development hosts>
** galaxy_root=<absolute path to the root of Galaxy deployment tree>
** galaxy_user=<username of the Galaxy user>
** galaxy_r_libs_base_dir=<absolute path to the root of R library tree>
* local Refinery project directory with the following templates:
** bash_profile_template and bashrc_template
** settings_local_*.py
* deployment_base_dir on the remote hosts must be:
** owned by project_user and project_group
** group writeable and have setgid attribute
* deployment_base_dir/'bootstrap' directory containing:
**Apache Solr package
**SPP R library package
* local user account running this script must be able:
** to run commands as root on target hosts using sudo
** SSH in to the target hosts as project_user
** to access Refinery Github account using an SSH key

'''

import os
import sys
from fabric.api import local, settings, abort, run, env, sudo, execute
from fabric.contrib import django
from fabric.contrib.console import confirm
from fabric.context_managers import hide, cd, prefix
from fabric.contrib.files import exists, upload_template
from fabric.decorators import task, with_settings
from fabric.operations import require
from fabric.utils import puts


# local settings
# Django
env.local_django_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(env.local_django_root)
from django.conf import settings as django_settings  # to avoid conflict with fabric.api.settings
# config files and templates
env.local_conf_dir = os.path.join(env.local_django_root, "fabric")

# remote settings
env.bootstrap_dir = os.path.join(env.deployment_base_dir, "bootstrap")

# Fabric settings
env.forward_agent = True    # for Github operations


def check_env_vars():
    '''Check if the required variable were initialized in ~/.fabricrc

    '''
    require("project_user", "project_group", "deployment_base_dir")


@task
def dev():
    '''Set config to development

    '''
    check_env_vars()
    env.hosts = env.dev_hosts.split(',') # variables in .fabricrc can only be strings
    env.dev_settings_file = "settings_local_dev.py"
    django.settings_module(os.path.splitext(env.dev_settings_file)[0])
    env.deployment_target_dir = os.path.join(env.deployment_base_dir, "dev")
    galaxy_base_dir = env.galaxy_root + "dev"
    env.galaxy_root = os.path.join(galaxy_base_dir, "live")
    env.galaxy_r_libs_target_dir = os.path.join(env.galaxy_r_libs_base_dir, "dev")


@task
def local():
    '''Set config to local

    '''
    env.dev_settings_file = "settings_local.py"
    django.settings_module(os.path.splitext(env.dev_settings_file)[0])


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
    update_project_user_home_dir()

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
    
    # add symlink for Refinery Apache config file 


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
def update_project_user_home_dir():
    '''Upload .bashrc and .bash_profile to $HOME of project_user

    '''
    bash_profile_path = os.path.join(env.local_conf_dir, "bash_profile_template")
    upload_template(bash_profile_path, "~/.bash_profile")

    bashrc_path = os.path.join(env.local_conf_dir, "bashrc_template")
    bashrc_context = {'deployment_target_dir': env.deployment_target_dir}
    upload_template(bashrc_path, "~/.bashrc", bashrc_context)


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
def start_postgresql_server():
    '''Start PostgreSQL server

    '''
    # need to check if the server is running because
    # service command exits with non-zero status if it is
    with settings(hide('everything'), warn_only=True):
        result = sudo("/sbin/service postgresql status")
    if result.failed:
        sudo("/sbin/service postgres start")
    else:
        puts("PostrgreSQL server is already running")


@task
@with_settings(user=env.project_user)
def upload_apache_settings():
    '''Upload Apache settings

    '''
    upload_template("{local_conf_dir}/refinery-apache.conf".format(**env),
                    "{deployment_target_dir}/etc/refinery-apache.conf".format(**env))


@task
def install_mod_wsgi():
    '''Install WSGI interface for Python web applications in Apache from the CentOS repository

    '''
    #TODO: mod_wsgi is compiled and installed manually
#    puts("Installing mod_wsgi")
#    sudo("yum -q -y install mod_wsgi")


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
    refinery_home = os.path.join(project_home, "Refinery", "refinery")  # for ./manage.py commands
    with prefix("workon refinery"):
        run("setvirtualenvproject $VIRTUAL_ENV {}".format(refinery_home))


@task
@with_settings(user=env.project_user)
def upload_refinery_settings():
    '''Upload appropriate settings_local file

    '''
    with prefix("workon refinery"), hide('commands'):
        refinery_home = run("pwd")
    django_settings_path = os.path.join(env.local_django_root, env.dev_settings_file)
    upload_template(django_settings_path,
                    os.path.join(refinery_home, "settings_local.py"),
                    backup=False)


@task
@with_settings(user=env.project_user)
def update_refinery():
    '''Pull code updates from the Github Refinery repository

    '''
    puts("Updating Refinery")
    with prefix("workon refinery"):
        run("git pull")
        run("./manage.py collectstatic --noinput")
        run("touch wsgi.py")


@task
@with_settings(user=env.project_user)
def init_virtualenv(env_name):
    '''Install requirements for the associated project

    '''
    with prefix("workon {}".format(env_name)):
        run("pip install -U -r ../requirements.txt")


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
@with_settings(user=env.project_user)
def create_refinery_db():
    '''Create PostgreSQL database for Refinery

    '''
    # check if the database already exists
    with settings(hide('commands'), warn_only=True):
        db_list = run("psql template1 -c 'SELECT datname FROM pg_database WHERE datistemplate = false;' -t")
    if django_settings.DATABASES['default']['NAME'] not in db_list:
        run("createdb -O {USER} {NAME}".format(**django_settings.DATABASES['default']))
    else:
        puts("PostgreSQL database '{NAME}' already exists".format(**django_settings.DATABASES['default']))


@task
@with_settings(user=env.project_user)
def create_refinery_data_dirs():
    '''Create Refinery data storage directories

    '''
    puts("Creating Refinery MEDIA_ROOT directory '{}'".format(django_settings.MEDIA_ROOT))
    if not exists(django_settings.MEDIA_ROOT):
        run("mkdir '{}'".format(django_settings.MEDIA_ROOT))
    else:
        puts("'{}' already exists".format(django_settings.MEDIA_ROOT))

    file_store_dir = os.path.join(django_settings.MEDIA_ROOT, django_settings.FILE_STORE_DIR)
    puts("Creating Refinery FILE_STORE_DIR at '{}'".format(file_store_dir))
    if not exists(file_store_dir):
        run("mkdir '{}'".format(file_store_dir))
    else:
        puts("'{}' already exists".format(file_store_dir))

    puts("Creating Refinery DOWNLOAD_BASE_DIR directory '{}'".format(django_settings.DOWNLOAD_BASE_DIR))
    if not exists(django_settings.DOWNLOAD_BASE_DIR):
        run("mkdir '{}'".format(django_settings.DOWNLOAD_BASE_DIR))
    else:
        puts("'{}' already exists".format(django_settings.DOWNLOAD_BASE_DIR))

    puts("Creating Refinery ISA_TAB_DIR directory '{}'".format(django_settings.ISA_TAB_DIR))
    if not exists(django_settings.ISA_TAB_DIR):
        run("mkdir '{}'".format(django_settings.ISA_TAB_DIR))
    else:
        puts("'{}' already exists".format(django_settings.ISA_TAB_DIR))

    puts("Creating Refinery ISA_TAB_TEMP_DIR directory '{}'".format(django_settings.ISA_TAB_TEMP_DIR))
    if not exists(django_settings.ISA_TAB_TEMP_DIR):
        run("mkdir '{}'".format(django_settings.ISA_TAB_TEMP_DIR))
    else:
        puts("'{}' already exists".format(django_settings.ISA_TAB_TEMP_DIR))


@task
def setup_refinery():
    '''Re-create refinery setup after dropdb
    Requires entering password for sudo access to the project account
    Django superuser account is created without a password

    '''
    if env.hosts:
        execute(upload_refinery_settings)
    execute(create_refinery_db)
    execute(refinery_syncdb)
    execute(init_refinery)
    execute(create_refinery_users)
    execute(create_galaxy_instances)
    execute(refinery_createsuperuser)
#    execute(refinery_changepassword("admin"))


@task
@with_settings(user=env.project_user)
def refinery_syncdb():
    '''Create database tables for all Django apps in Refinery
    (does not create a superuser account)

    '''
    #TODO: make non-interactive
    with prefix("workon refinery"):
        run("./manage.py syncdb --noinput")


@task
@with_settings(user=env.project_user)
def refinery_createsuperuser():
    '''Create the Django superuser account without assigning a password

    '''
    with prefix("workon refinery"), settings(hide('commands'), warn_only=True):
        # createsuperuser returns 1 if username already exists
        run("./manage.py createsuperuser --noinput --username {} --email {}"
            .format(django_settings.REFINERY_SUPERUSER['username'],
                    django_settings.REFINERY_SUPERUSER['email']))


@task
@with_settings(user=env.project_user)
def refinery_changepassword(username):
    '''Change password for an existing Django user account
    (requires user input)
    Useful for creating a password for the Django superuser
    after Refinery has been set up for the first time

    '''
    if username:
        with prefix("workon refinery"):
            run("./manage.py changepassword {}".format(username))
    else:
        puts("Username was not provided - cannot change password")


@task
@with_settings(user=env.project_user)
def init_refinery():
    '''Initialize Refinery
    (create public group "Public", etc)
    '''
    with prefix("workon refinery"):
        run("./manage.py init_refinery")


@task
@with_settings(user=env.project_user)
def create_refinery_user(user_id):
    '''Create a user account in Refinery

    '''
    user = django_settings.REFINERY_USERS[user_id]
    with prefix("workon refinery"), settings(warn_only=True):
        run("./manage.py create_user "
            "'{username}' '{password}' '{email}' '{firstname}' '{lastname}' '{affiliation}'"
            .format(**user))


@task
@with_settings(user=env.project_user)
def create_refinery_users():
    '''Create all user accounts specified in settings

    '''
    for user_id in django_settings.REFINERY_USERS.keys():
        execute(create_refinery_user, user_id)


@task
@with_settings(user=env.project_user)
def create_galaxy_instance(instance_id):
    '''Create a Galaxy instance in Refinery

    '''
    instance = django_settings.GALAXY_INSTANCES[instance_id]
    with prefix("workon refinery"):
        run("./manage.py create_galaxy_instance '{base_url}' '{api_key}' '{description}'"
            .format(**instance))


@task
@with_settings(user=env.project_user)
def create_galaxy_instances():
    '''Create all Galaxy instances specified in settings

    '''
    for instance_id in django_settings.GALAXY_INSTANCES.keys():
        execute(create_galaxy_instance, instance_id)


@task
@with_settings(user=env.project_user)
def import_workflows():
    '''Import all available workflows from all available Galaxy instances into Refinery

    '''
    #TODO: check for idempotence
    with prefix("workon refinery"):
        run("./manage.py import_workflows")


@task
@with_settings(user=env.project_user)
def install_solr():
    '''Install Solr

    '''
    run("unzip -uq {bootstrap_dir}/apache-solr-4.0.0.zip -d {deployment_target_dir}/apps"
        .format(**env))


@task
@with_settings(user=env.project_user)
def build_solr_schema(core):
    '''Generate Solr schema for a specific core

    '''
    #TODO: build schema for a specific core
    core_conf_dir = "./solr/{}/conf".format(core)
    with prefix("workon refinery"):
        if not exists(core_conf_dir):
            run("mkdir {}".format(core_conf_dir))
        run("./manage.py build_solr_schema --using={} > {}/schema.xml"
            .format(core, core_conf_dir))


@task
@with_settings(user=env.project_user)
def rebuild_solr_index(module):
    '''Rebuild Solr index for the specific core

    '''
    #TODO: check for idempotence
    with prefix("workon refinery"):
        run("./manage.py rebuild_index --noinput --using={}".format(module))


def deploy_refinery():
    '''Install Refinery application from scratch

    '''
    create_virtualenv("refinery")
    clone_refinery("develop")
    init_virtualenv("refinery")
    create_refinery_db_user()
    create_refinery_db()
    create_refinery_data_dirs()
    setup_refinery()


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

@task
@with_settings(user=env.project_user)
def upload_galaxy_tool_data():
    '''Upload Galaxy tool data files to the current Galaxy instance

    '''
    #TODO: change settings to env.galaxy_user
    tool_data_path = os.path.join(env.galaxy_root, "tool-data")

    local_path = os.path.join(env.local_conf_dir, "bowtie_indices_template")
    remote_path = os.path.join(tool_data_path, "bowtie_indices.loc")
    upload_template(local_path, remote_path)

    local_path = os.path.join(env.local_conf_dir, "sam_fa_indices_template")
    remote_path = os.path.join(tool_data_path, "sam_fa_indices.loc")
    upload_template(local_path, remote_path)


@task
def update_galaxy_user_home():
    '''Upload Bash config, R config to $HOME of the Galaxy user and create R library dir

    '''
    #TODO: change settings to env.galaxy_user
    with hide('commands'):
        home_dir = run("echo ~{}".format(env.galaxy_user))

    local_path = os.path.join(env.local_conf_dir, "bashrc_galaxy_template")
    remote_path = os.path.join(home_dir, ".bashrc.customizations")
    bashrc_context = {'galaxy_r_libs': env.galaxy_r_libs_base_dir}
    upload_template(local_path, remote_path, bashrc_context, backup=False)

    local_path = os.path.join(env.local_conf_dir, "Rprofile_template")
    remote_path = os.path.join(home_dir, ".Rprofile")
    upload_template(local_path, remote_path, backup=False)

    run("mkdir -pv {}".format(env.galaxy_r_libs_target_dir))


@task
@with_settings(user=env.project_user)
def install_spp():
    '''Install SPP R library

    '''
    #TODO: change settings to env.galaxy_user before using
    #TODO: specidy 'lib' to make sure packahes is installed into the correct location
    run("R -e \"install.packages('caTools')\"")
    run("R -e \"install.packages('{bootstrap_dir}/spp_1.11.tar.gz')\"".format(**env))


@task
@with_settings(user=env.project_user)
def install_spp_galaxy_tool():
    '''Add SPP tool to the current Galaxy instance

    '''
    #TODO: change settings to env.galaxy_user or add to private toolshed
    run("cp {bootstrap_dir}/spp_peak_caller.xml {galaxy_root}/tools/peak_calling".format(**env))
    with prefix("cd {galaxy_root}/tools/peak_calling".format(**env)):
        run("ln -s ../plotting/r_wrapper.sh")


@task
@with_settings(user=env.project_user)
def install_igvtools():
    '''Add IGV tools to the current Galaxy instance

    '''
    #TODO: change settings to env.galaxy_user or install using main toolshed

    #$ cd $GALAXYROOT/tools
    #$ hg clone http://toolshed.g2.bx.psu.edu/repos/jjohnson/igvtools
    #move files to appropriate directories
    #$ cp igvtools/lib/galaxy/datatypes/igv.py $GALAXYROOT/lib/galaxy/datatypes
    #$ cp igvtools/tool-data/datatypes_conf.xml $GALAXYROOT/tool-data
    #$ cp igvtools/tool-data/igv_indices.loc.sample $GALAXYROOT/tool-data/igv_indices.loc (replace with a template?)
    #
    #install .genome files
    #e.g., to /n/hsphS10/hsphfs1/chb/biodata/genomes/igv
    #
    #edit $GALAXYROOT/tool-data/igv_indices.loc


@task
@with_settings(user=env.project_user)
def install_tabular_to_bed():
    '''Add tabular-to-bed tool to the current Galaxy instance

    '''
    #TODO: change settings to env.galaxy_user or add this tool to private toolshed
    # /n/hsphS10/hsphfs1/stemcellcommons/bootstrap
#    $ cp tabular_to_bed.py $GALAXYROOT/tools/next_gen_conversion
#    $ cp tabular_to_bed.xml $GALAXYROOT/tools/next_gen_conversion
    # edit tool_conf.xml


@task
@with_settings(user=env.project_user)
def upload_galaxy_tool_conf():
    '''Update tool_conf.xml in the current Galaxy instance

    '''
    #TODO: change settings to env.galaxy_user
    local_path = os.path.join(env.local_conf_dir, "tool_conf_xml_template")
    remote_path = os.path.join(env.galaxy_root, "tool_conf.xml")
    upload_template(local_path, remote_path)


@task
def restart_galaxy():
    '''Restart Galaxy using service command

    '''
    #TODO: change settings to env.galaxy_user
    sudo("/sbin/service galaxy restart")

