$appuser = "vagrant"
$appgroup = "vagrant"
$virtualenv = "/home/${appuser}/.virtualenvs/refinery-platform"
$requirements = "/vagrant/requirements.txt"
$project_root = "/vagrant/refinery"
$ui_app_root = "${project_root}/ui"

sysctl { 'vm.swappiness': value => '10' }

file { "/home/${appuser}/.ssh/config":
  ensure => file,
  source => "/vagrant/deployment/ssh-config",
  owner => $appuser,
  group => $appgroup,
}

# temp workaround from https://github.com/puppetlabs/puppetlabs-postgresql/issues/348
class { 'concat::setup':
  before => Class['postgresql::server'],
}
class { 'postgresql::globals':
  version => '9.3',
  encoding => 'UTF8',
  locale => 'en_US.utf8',
}
class { 'postgresql::server':
}
class { 'postgresql::lib::devel':
}
postgresql::server::db { 'refinery':
  user => $appuser,
  password => '',
}

class { 'python':
  version => 'system',
  pip => true,
  dev => true,
  virtualenv => true,
}

class venvdeps {
  #TODO: peg packages to specific versions
  package { 'build-essential': }
  package { 'libncurses5-dev': }
  package { 'libldap2-dev': }
  package { 'libsasl2-dev': }
  package { 'libffi-dev': }  # for SSL modules
}
include venvdeps

python::virtualenv { $virtualenv:
  ensure => present,
  owner => $appuser,
  group => $appgroup,
  require => [ Class['venvdeps'], Class['postgresql::lib::devel'] ],
}
->
exec { "pip_requirements_install":
  # specifying metaparameter requirements for python::virtualenv doesn't re-run
  # pip after virtual environment has been created
  command => "${virtualenv}/bin/pip install -r ${requirements}",
  user => $appuser,
  group => $appgroup,
  timeout     => 4800,
}

package { 'virtualenvwrapper': }
->
file_line {"virtualenvwrapper_config":
  path => "/home/${appuser}/.profile",
  line => "source /etc/bash_completion.d/virtualenvwrapper",
  require => Python::Virtualenv[$virtualenv],
}
->
file { "virtualenvwrapper_project":
  # workaround for setvirtualenvproject command not found
  ensure => file,
  path => "${virtualenv}/.project",
  content => "${project_root}",
  owner => $appuser,
  group => $appgroup,
}

file { ["/vagrant/media", "/vagrant/static", "/vagrant/isa-tab" ]:
  ensure => directory,
  owner => $appuser,
  group => $appgroup,
}

exec { "syncdb":
  command => "${virtualenv}/bin/python ${project_root}/manage.py syncdb --migrate --noinput",
  user => $appuser,
  group => $appgroup,
  require => [
               File["/vagrant/media"],
               Python::Virtualenv[$virtualenv],
               Postgresql::Server::Db["refinery"]
             ],
}
->
exec { "create_superuser":
  command => "${virtualenv}/bin/python ${project_root}/manage.py loaddata superuser.json",
  user => $appuser,
  group => $appgroup,
}
->
exec { "init_refinery":
  command => "${virtualenv}/bin/python ${project_root}/manage.py init_refinery 'Refinery' '192.168.50.50:8000'",
  user => $appuser,
  group => $appgroup,
}
->
exec { "create_user":
  command => "${virtualenv}/bin/python ${project_root}/manage.py create_user 'guest' 'guest' 'guest@example.com' 'Guest' '' ''",
  user => $appuser,
  group => $appgroup,
}
->
exec {
  "build_core_schema":
    command => "${virtualenv}/bin/python ${project_root}/manage.py build_solr_schema --using=core > solr/core/conf/schema.xml",
    cwd => $project_root,
    user => $appuser,
    group => $appgroup;
  "build_data_set_manager_schema":
    command => "${virtualenv}/bin/python ${project_root}/manage.py build_solr_schema --using=data_set_manager > solr/data_set_manager/conf/schema.xml",
    cwd => $project_root,
    user => $appuser,
    group => $appgroup;
}

class solr {
  $solr_version = "4.4.0"
  $solr_archive = "solr-${solr_version}.tgz"
  $solr_url = "http://archive.apache.org/dist/lucene/solr/${solr_version}/${solr_archive}"

  package { 'java':
    name => 'openjdk-7-jre-headless',
  }

  exec { "solr_wget":
    command => "wget ${solr_url} -O /usr/src/${solr_archive}",
    creates => "/usr/src/${solr_archive}",
    path => "/usr/bin:/bin",
    timeout => 600,  # downloading can take a long time
  }
  ->
  exec { "solr_unpack":
    command => "mkdir -p /opt && tar -xzf /usr/src/${solr_archive} -C /opt && chown -R ${appuser}:${appuser} /opt/solr-${solr_version}",
    creates => "/opt/solr-${solr_version}",
    path => "/usr/bin:/bin",
  }
  ->
  file { "/opt/solr":
    ensure => link,
    target => "solr-${solr_version}",
  }
}
include solr

class rabbit {
  package { 'curl': }
  ->
  class { '::rabbitmq':
    package_ensure => installed,
    service_ensure => running,
    port => '5672',
  }
  rabbitmq_user { 'guest':
    password => 'guest',
    require => Class['::rabbitmq'],
  }
  rabbitmq_vhost { 'localhost':
    ensure => present,
    require => Class['::rabbitmq'],
  }
  rabbitmq_user_permissions { 'guest@localhost':
    configure_permission => '.*',
    read_permission => '.*',
    write_permission => '.*',
    require => [ Rabbitmq_user['guest'], Rabbitmq_vhost['localhost'] ]
  }
}
include rabbit

class ui {
  # need a version of Node that's more recent than one included with Ubuntu 12.04
  apt::ppa { 'ppa:chris-lea/node.js': }
  include apt

  package { 'nodejs':
    name => 'nodejs',
    require => Apt::Ppa['ppa:chris-lea/node.js'],
  }
  ->
  package {
    'bower': ensure => '1.3.8', provider => 'npm';
    'jshint': ensure => '2.4.4', provider => 'npm';
    'grunt-cli': ensure => '0.1.13', provider => 'npm';
  }
  ->
  exec { "npm_local_modules":
    command => "/usr/bin/npm install",
    cwd => $ui_app_root,
    logoutput => on_failure,
    user => $appuser,
    group => $appgroup,
  }
  ->
  exec { "bower_modules":
    command => "/usr/bin/bower install",
    cwd => $ui_app_root,
    logoutput => on_failure,
    user => $appuser,
    group => $appgroup,
    environment => ["HOME=/home/${appuser}"],
  }
  ->
  exec { "grunt":
    command => "/usr/bin/grunt",
    cwd => $ui_app_root,
    logoutput => on_failure,
    user => $appuser,
    group => $appgroup,
  }
  ->
  exec { "collectstatic":
    command => "${virtualenv}/bin/python ${project_root}/manage.py collectstatic --noinput",
    user => $appuser,
    group => $appgroup,
    require => Python::Virtualenv[$virtualenv],
  }
}
include ui

file { "${project_root}/supervisord.conf":
  ensure => file,
  source => "${project_root}/supervisord.conf.sample",
  owner => $appuser,
  group => $appgroup,
}
->
exec { "supervisord":
  command => "${virtualenv}/bin/supervisord",
  cwd => $project_root,
  creates => "/tmp/supervisord.pid",
  user => $appuser,
  group => $appgroup,
  require => [ Class["ui"], Class["solr"], Class ["rabbit"] ],
}

package { 'libapache2-mod-wsgi': }
->
file { "/etc/apache2/sites-available":
    ensure => "directory",
}
->
file { "/etc/apache2/sites-enabled":
    ensure => "directory",
}
->
file { "/etc/apache2/sites-available/refinery":
  ensure => file,
  content => template("/vagrant/deployment/apache.conf"),
}
->
file { "/etc/apache2/sites-enabled/001-refinery":
  ensure => link,
  target => "../sites-available/refinery",
}
~>
service { 'apache2':
  ensure => running,
  hasrestart => true
}
