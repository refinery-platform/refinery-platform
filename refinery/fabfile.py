'''
Created on Oct 24, 2012

Deployment script for the Refinery software environment

OS: CentOS 5.7

Requirements:
* ~/.fabricrc (see fabricrc.txt for details):
* Config file templates:
** bash_profile
** bashrc
** settings_local_*.py
* deployment_base_dir on the remote hosts must be:
** owned by project_user and project_group
** group writeable and have setgid attribute
* project_user home dir
* local user account running this script must be able:
** to run commands as root on target hosts using sudo
** SSH in to the target hosts as project_user
** to access Refinery Github account using an SSH key

'''

import os
import sys
from fabric.api import settings, abort, run, env, sudo, execute
from fabric.contrib import django
from fabric.context_managers import hide, prefix
from fabric.contrib.files import exists, upload_template
from fabric.decorators import task, with_settings
from fabric.operations import require, open_shell, put
from fabric.utils import puts


env.local_project_dir = os.path.dirname(os.path.abspath(__file__))
env.local_template_dir = os.path.join(env.local_project_dir, "fabric")

# Django integration
sys.path.append(env.local_project_dir)
# use import as to avoid conflict with fabric.api.settings
from django.conf import settings as django_settings


# Fabric settings
env.forward_agent = True    # for Github operations


def check_env_vars():
    '''Check if the required variable were initialized in ~/.fabricrc

    '''
    require("deployment_dir", "project_user", "project_group",
            "refinery_repo_url", "refinery_virtualenv_name", "solr_base_dir")


def software_config():
    '''Configure software package names and commands

    '''
    if env.os == "CentOS":
        # configure software package names
        env.postgresql_server_pkg = "postgresql84-server"
        env.postgresql_devel_pkg = "postgresql84-devel"
        env.git_pkg = "git"
        env.rabbitmq_server_pkg = "rabbitmq-server"
        env.supervisor_pkg = "supervisor"
    else:
        abort("{os} is not supported".format(**env))

    env.solr_version = "4.2.0"
    env.solr_pkg = "solr-" + env.solr_version   # Solr directory name
    env.solr_mirrors = [
        "http://apache.mirrors.pair.com/lucene/solr/4.2.0/solr-4.2.0.tgz",
        "http://www.gtlib.gatech.edu/pub/apache/lucene/solr/4.2.0/solr-4.2.0.tgz",
        "http://mirrors.ibiblio.org/apache/lucene/solr/4.2.0/solr-4.2.0.tgz"]


def directory_structure_config():
    '''Configure directory layout

    '''
    env.app_dir = os.path.join(env.deployment_dir, "apps")
    env.virtualenv_dir = os.path.join(env.deployment_dir, "virtualenvs")
    env.data_dir = os.path.join(env.deployment_dir, "data")
    env.conf_dir = os.path.join(env.deployment_dir, "etc")
    env.log_dir = os.path.join(env.deployment_dir, "logs")
    env.refinery_base_dir = os.path.join(env.app_dir, env.refinery_virtualenv_name)
    env.refinery_project_dir = os.path.join(env.refinery_base_dir, "refinery")
    env.refinery_virtualenv_dir = os.path.join(env.virtualenv_dir, env.refinery_virtualenv_name)


@task
def dev():
    '''Set config to development

    '''
    check_env_vars()
    env.hosts = [env.dev_host]
    env.dev_settings_file = "settings_local_dev.py"
    django.settings_module(os.path.splitext(env.dev_settings_file)[0])
    env.refinery_branch = "develop"
    software_config()
    directory_structure_config()
    # config file templates
    env.local_conf_dir = os.path.join(env.local_template_dir, "dev")
    env.bash_profile_template = "bash_profile"
    env.bashrc_template = "bashrc"
    #Galaxy config
    galaxy_base_dir = env.galaxy_root + "dev"
    env.galaxy_root = os.path.join(galaxy_base_dir, "live")


@task
def stage():
    '''Set config to staging

    '''
    check_env_vars()
    env.hosts = [env.stage_host]
    env.dev_settings_file = "settings_local_stage.py"
    django.settings_module(os.path.splitext(env.dev_settings_file)[0])
    env.refinery_branch = "develop"
    software_config()
    directory_structure_config()
    # config file templates
    env.local_conf_dir = os.path.join(env.local_template_dir, "stage")
    env.bash_profile_template = "bash_profile"
    env.bashrc_template = "bashrc"


@task
def prod():
    '''Set config to production

    '''
    #TODO: implement using stage() as a template
    # add a warning message/confirmation about changing config on production VM


@task
def loc():
    '''Set config to local (requires SSH server running on localhost)

    '''
    env.dev_settings_file = "settings_local.py"
    django.settings_module(os.path.splitext(env.dev_settings_file)[0])
    env.os = env.local_os


@task
def bootstrap():
    '''Initialize the target VM from the default state

    '''
    upload_bash_config()

    # install and configure required software packages
    install_postgresql()
    init_postgresql()
    install_git()
    install_rabbitmq()
    init_rabbitmq()
    configure_rabbitmq()

    deploy_refinery()

    # init db
    # create users
    # init virtualenvs
    # install requirements
    # add symlink for Refinery Apache config file


@task
@with_settings(user=env.project_user)
def upload_bash_config():
    '''Upload .bashrc and .bash_profile to $HOME of project_user

    '''
    bash_profile_path = os.path.join(env.local_conf_dir, env.bash_profile_template)
    upload_template(bash_profile_path, "~/.bash_profile")

    bashrc_path = os.path.join(env.local_conf_dir, env.bashrc_template)
    bashrc_context = {"app_dir": env.app_dir,
                      "virtualenv_dir": env.virtualenv_dir}
    upload_template(bashrc_path, "~/.bashrc", bashrc_context)


@task
def install_postgresql():
    '''Install PostgreSQL server and development libraries
    (pg_config is required by psycopg2 module)
    '''
    puts("Installing PostgreSQL")
    if env.os == "CentOS":
        sudo("yum -q -y install {postgresql_server_pkg}".format(**env))
        sudo("yum -q -y install {postgresql_devel_pkg}".format(**env))
    elif env.os == "Debian":
        pass


@task
def init_postgresql():
    '''Configure PostgreSQL server to start automatically at boot time and
    create a new database cluster

    '''
    if env.os == "CentOS":
        # make sure server starts at boot time
        sudo("/sbin/chkconfig postgresql on")
        with settings(hide('warnings'), warn_only=True):
            # initdb command returns 1 if data directory is not empty
            sudo("/sbin/service postgresql initdb")
    elif env.os == "Debian":
        pass


@task
def start_postgresql():
    '''Start PostgreSQL server

    '''
    if env.os == "CentOS":
        # need to check if the server is running because
        # service command exits with non-zero status if it is
        with settings(hide('everything'), warn_only=True):
            result = sudo("/sbin/service postgresql status")
        if result.failed:
            sudo("/sbin/service postgresql start")
        else:
            puts("PostrgreSQL server is already running")
    elif env.os == "Debian":
        pass


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
    Make sure database user exists before running this task

    '''
    # check if the database already exists
    with settings(hide('commands'), warn_only=True):
        db_list = run("psql template1 -c 'SELECT datname FROM pg_database WHERE datistemplate = false;' -t")
    if django_settings.DATABASES['default']['NAME'] not in db_list:
        run("createdb -O {USER} {NAME}".format(**django_settings.DATABASES['default']))
    else:
        puts("PostgreSQL database '{NAME}' already exists".format(**django_settings.DATABASES['default']))


@task
def install_git():
    '''Install Git from the CentOS repository

    '''
    puts("Installing Git")
    if env.os == "CentOS":
        sudo("yum -q -y install {git_pkg}".format(**env))
    elif env.os == "Debian":
        pass


@task
def install_rabbitmq():
    '''Install RabbitMQ server

    '''
    puts("Installing RabbitMQ server")
    if env.os == "CentOS":
        sudo("yum -q -y install {rabbitmq_server_pkg}".format(**env))
    elif env.os == "Debian":
        pass


@task
def init_rabbitmq():
    '''Configure RabbitMQ to start at boot time

    '''
    if env.os == "CentOS":
        sudo("/sbin/chkconfig rabbitmq-server on")
    elif env.os == "Debian":
        pass


@task
def start_rabbitmq():
    '''Start RabbitMQ server

    '''
    if env.os == "CentOS":
        # need to check if the server is running because
        # service command exits with non-zero status if it is
        with settings(hide('everything'), warn_only=True):
            result = sudo("/sbin/service rabbitmq-server status")
        if result.failed:
            sudo("/sbin/service rabbitmq-server start")
        else:
            puts("RabbitMQ is already running")
    elif env.os == "Debian":
        pass


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
def install_mod_wsgi():
    '''Install WSGI interface for Python web applications in Apache from the CentOS repository

    '''
    if env.os == "CentOS":
        # mod_wsgi is compiled and installed manually on CentOS 5.7
        pass
    elif env.os == "Debian":
        pass


@task
@with_settings(user=env.project_user)
def git_clone(branch, repo_url, target_dir):
    '''Clone specified branch of Github repository
    Helper for clone_refinery()

    '''
    puts("Cloning branch '{}' from '{}' into {}"
         .format(branch, repo_url, target_dir))
    if exists(os.path.join(target_dir, ".git")):
        puts("Git project already exists in '{}'".format(target_dir))
    else:
        run("git clone -b {} {} {}".format(branch, repo_url, target_dir))


@task
@with_settings(user=env.project_user)
def clone_refinery():
    '''Clone Refinery repository from Github

    '''
    execute(git_clone,
            branch=env.refinery_branch,
            repo_url=env.refinery_repo_url,
            target_dir=env.refinery_base_dir)


@task
@with_settings(user=env.project_user)
def create_virtualenv(env_name, project_path):
    '''Create a virtual environment using provided name and associate it with
    provided project path (must exist, create with clone_refinery())
    Helper for create_refinery_virtualenv()

    '''
    run("mkvirtualenv -a {} {}".format(project_path, env_name))


@task
@with_settings(user=env.project_user)
def create_refinery_virtualenv():
    '''Create a virtual environment for Refinery

    '''
    execute(create_virtualenv, env_name=env.refinery_virtualenv_name,
            project_path=env.refinery_project_dir)


@task
@with_settings(user=env.project_user)
def git_pull(env_name):
    '''Pull the latest code from Github repository into the specified virtual env

    '''
    with prefix("workon {}".format(env_name)):
        run("git pull")


@task
@with_settings(user=env.project_user)
def refinery_pull():
    '''Pull the latest Refinery code from Github repository

    '''
    execute(git_pull, env_name=env.refinery_virtualenv_name)


@task
@with_settings(user=env.project_user)
def install_requirements(env_name, requirements_path):
    '''Install Python packages listed in requirements.txt into the given virtualenv
    Helper for install_refinery_requirements()

    '''
    with prefix("workon {}".format(env_name)):
        run("pip install -U -r {}".format(requirements_path))


@task
@with_settings(user=env.project_user)
def install_refinery_requirements():
    '''Install Refinery Python packages

    '''
    execute(install_requirements,
            env_name=env.refinery_virtualenv_name,
            requirements_path=os.path.join(env.refinery_base_dir, "requirements.txt"))


@task
@with_settings(user=env.project_user)
def upload_refinery_settings():
    '''Upload appropriate settings_local.py file

    '''
    local_path = os.path.join(env.local_project_dir, env.dev_settings_file)
    remote_path = os.path.join(env.refinery_project_dir, "settings_local.py")
    upload_template(local_path, remote_path, backup=False)
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        run("touch wsgi.py")


@task
@with_settings(user=env.project_user)
def upload_supervisor_config():
    '''Upload Supervisor settings

    '''
    remote_path = os.path.join(env.refinery_project_dir, "supervisord.conf")
    upload_template("supervisord.conf", remote_path, env, use_jinja=True,
                    template_dir=env.local_conf_dir, backup=False)


@task
@with_settings(user=env.project_user)
def install_solr():
    '''Install Solr

    '''
    #TODO: finish implementation
    for url in env.solr_mirrors:
        # remove failed download from disk if necessary
        with settings(warn_only=True):
            result = run("wget -P /tmp {}".format(url))
        if result.succeeded:
            break
        else:
            pass
    # unpack
    # move to /opt (moving as superuser preserves ownership)
    # symlink to /opt/solr (check if already exists)


@task
@with_settings(user=env.project_user)
def build_solr_schema(core):
    '''Generate Solr schema for a specific core

    '''
    #TODO: build schema for a specific core
    core_conf_dir = "./solr/{}/conf".format(core)
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
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
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        run("./manage.py rebuild_index --noinput --using={}".format(module))


@task
def setup_refinery():
    '''Re-create refinery setup after dropdb
    Requires entering password for sudo access to the project account
    Django superuser account is created without a password

    '''
    execute(upload_refinery_settings)
    execute(create_refinery_db)
    execute(refinery_syncdb)
    execute(refinery_migrate)
    execute(init_refinery)
    execute(create_refinery_users)
    execute(create_galaxy_instances)
    execute(refinery_createsuperuser)
#    execute(refinery_changepassword("admin"))


@task
@with_settings(user=env.project_user)
def update_refinery():
    '''Pull code updates from the Github Refinery repository

    '''
    #TODO: refactor to move each operation to a separate task
    puts("Updating Refinery")
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        run("git pull")
        run("./manage.py syncdb --migrate")
        run("./manage.py collectstatic --noinput")
        run("supervisorctl restart celeryd".format(**env))
        run("supervisorctl restart celerycam".format(**env))
        run("touch wsgi.py")


@task
@with_settings(user=env.project_user)
def upload_apache_config():
    '''Upload Apache settings
    Requires symlink in /etc/httpd/conf.d

    '''
    #TODO: add variables to the template
    upload_template("{local_conf_dir}/refinery-apache.conf".format(**env),
                    "{conf_dir}/refinery-apache.conf".format(**env))


@task
@with_settings(user=env.project_user)
def kill_celeryd():
    '''Kill all celeryd processes in case they cannot be stopped normally
    Not necessary with supervisord v3.0 (supports stopasgroup and killasgroup)?

    '''
    with settings(warn_only=True):
        open_shell("ps auxww | grep celeryd | awk '{print $2}' | xargs kill -9")


@task
@with_settings(user=env.project_user)
def refinery_syncdb():
    '''Create database tables for all Django apps in Refinery
    (does not create a superuser account)

    '''
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        run("./manage.py syncdb --noinput --all")


@task
@with_settings(user=env.project_user)
def refinery_migrate():
    '''Perform database migration using South

    '''
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        run("./manage.py migrate --fake")
    

@task
@with_settings(user=env.project_user)
def refinery_collectstatic():
    '''Collect static files

    '''
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        run("./manage.py collectstatic --noinput")


@task
@with_settings(user=env.project_user)
def refinery_createsuperuser():
    '''Create the Django superuser account without assigning a password

    '''
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        with settings(hide('commands'), warn_only=True):
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
        with prefix("workon {refinery_virtualenv_name}".format(**env)):
            run("./manage.py changepassword {}".format(username))
    else:
        puts("Username was not provided - cannot change password")


@task
@with_settings(user=env.project_user)
def init_refinery():
    '''Initialize Refinery (create Public group, create Site, etc)

    '''
    #TODO: add args: refinery_instance_name and refinery_base_url
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        run("./manage.py init_refinery '{}' '{}'"
            .format(django_settings.SITE_NAME, django_settings.SITE_BASE_URL))


@task
@with_settings(user=env.project_user)
def create_refinery_user(user_id):
    '''Create a user account in Refinery

    '''
    user = django_settings.REFINERY_USERS[user_id]
    user_fields = \
        "'{username}' '{password}' '{email}' '{firstname}' '{lastname}' '{affiliation}'"\
        .format(**user)
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        with settings(warn_only=True):
            run("./manage.py create_user {}".format(user_fields))


@task
@with_settings(user=env.project_user)
def create_refinery_users():
    '''Create all user accounts specified in settings

    '''
    for user_id in django_settings.REFINERY_USERS.keys():
        execute(create_refinery_user, user_id)


@task
@with_settings(user=env.project_user)
def upload_logrotate_config():
    '''Upload Logrotate settings
    Requires symlinks in /etc/logrotate.d

    '''
    upload_template("{local_conf_dir}/refinery-logrotate.conf".format(**env),
                    "{conf_dir}/refinery-logrotate.conf".format(**env),
                    backup=False)
    upload_template("{local_conf_dir}/apache-logrotate.conf".format(**env),
                    "{conf_dir}/apache-logrotate.conf".format(**env),
                    backup=False)
    upload_template("{local_conf_dir}/galaxy-logrotate.conf".format(**env),
                    "{conf_dir}/galaxy-logrotate.conf".format(**env),
                    backup=False)


@task
@with_settings(user=env.project_user)
def create_galaxy_instance(instance_id):
    '''Create a Galaxy instance in Refinery

    '''
    instance = django_settings.GALAXY_INSTANCES[instance_id]
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        run("./manage.py create_galaxy_instance '{base_url}' '{api_key}' --description '{description}'"
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
    with prefix("workon {refinery_virtualenv_name}".format(**env)):
        run("./manage.py import_workflows")


def deploy_refinery():
    '''Install Refinery application from scratch

    '''
    create_virtualenv("refinery")
    clone_refinery("develop")
#    init_virtualenv("refinery")
    create_refinery_db_user()
    create_refinery_db()
    setup_refinery()


@task
def restart_galaxy():
    '''Restart Galaxy using service command

    '''
    #TODO: change settings to env.galaxy_user
    sudo("/sbin/service galaxy restart")

