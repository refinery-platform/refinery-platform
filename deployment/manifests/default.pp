$appuser = "vagrant"
$virtualenv = "/home/${appuser}/.virtualenvs/refinery-platform"
$venvpath = "${virtualenv}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/opt/vagrant_ruby/bin"
$requirements = "/vagrant/requirements.txt"
$project_root = "/vagrant/refinery"
$ui_app_root = "${project_root}/ui"

#TODO: peg packages to specific versions
class venvdeps {
  package { 'build-essential': }
  package { 'libncurses5-dev': }
  package { 'libldap2-dev': }
  package { 'libsasl2-dev': }
  package { 'libffi-dev': }  # for SSL modules
}
include venvdeps

package { 'java':
  name => 'openjdk-7-jre-headless',
}  # required by solr
package { 'curl': }  # required by rabbitmq installer
package { 'virtualenvwrapper': }

# temp workaround from https://github.com/puppetlabs/puppetlabs-postgresql/issues/348
class { 'concat::setup':
  before => Class['postgresql::server'],
}
class { 'postgresql::globals':
  version => '9.1',
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
~>
python::virtualenv { $virtualenv:
  ensure => present,
  requirements => $requirements,
  owner => $appuser,
  group => $appuser,
  require => [
               Class['venvdeps'],
               Class['postgresql::lib::devel'],
             ]
}

file { [ "/vagrant/media", "/vagrant/static", "/vagrant/isa-tab" ]:
  ensure => directory,
  owner => $appuser,
  group => $appuser,
}

exec { "syncdb":
  command => "python ${project_root}/manage.py syncdb --migrate --noinput",
  path => $venvpath,
  user => $appuser,
  group => $appuser,
  require => [
               File["/vagrant/media"],
               Python::Virtualenv[$virtualenv],
               Postgresql::Server::Db["refinery"]
             ],
}
->
exec { "init_refinery":
  command => "python ${project_root}/manage.py init_refinery 'Refinery' '192.168.50.50:8000'",
  path => $venvpath,
  user => $appuser,
  group => $appuser,
}
->
exec {
  "build_core_schema":
    command => "python ${project_root}/manage.py build_solr_schema --using=core > solr/core/conf/schema.xml",
    cwd => $project_root,
    path => $venvpath,
    user => $appuser,
    group => $appuser;
  "build_data_set_manager_schema":
    command => "python ${project_root}/manage.py build_solr_schema --using=data_set_manager > solr/data_set_manager/conf/schema.xml",
    cwd => $project_root,
    path => $venvpath,
    user => $appuser,
    group => $appuser;
}

$solr_version = "4.4.0"
$solr_archive = "solr-${solr_version}.tgz"
$solr_url = "http://archive.apache.org/dist/lucene/solr/${solr_version}/${solr_archive}"
exec { "solr_wget":
  command => "wget ${solr_url} -O /usr/src/${solr_archive}",
  creates => "/usr/src/${solr_archive}",
  path => "/usr/bin:/bin",
  timeout => 600,
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

# configure rabbitmq
class { '::rabbitmq':
  package_ensure => installed,
  service_ensure => running,
  port => '5672',
  require => Package['curl'],
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

file { "${project_root}/supervisord.conf":
  ensure => file,
  source => "${project_root}/supervisord.conf.sample",
  owner => $appuser,
  group => $appuser,
}

include apt
# need a version of Node that's more recent than one included with system
apt::ppa { 'ppa:chris-lea/node.js': }

package { 'nodejs':
  name => 'nodejs',
  require => Apt::Ppa['ppa:chris-lea/node.js'],
}
->
exec { "npm_global_modules":
  command => "/usr/bin/npm install -g bower@1.3.9 jshint@2.4.4 grunt-cli@0.1.13",
  logoutput => on_failure,
}
->
exec { "npm_local_modules":
  command => "/usr/bin/npm install",
  cwd => $ui_app_root,
  logoutput => on_failure,
  user => $appuser,
  group => $appuser,
}
->
exec { "bower_modules":
  command => "/usr/bin/bower install",
  cwd => $ui_app_root,
  logoutput => on_failure,
  user => $appuser,
  group => $appuser,
  environment => ["HOME=/home/${appuser}"],
}
->
exec { "grunt":
  command => "/usr/bin/grunt",
  cwd => $ui_app_root,
  logoutput => on_failure,
  user => $appuser,
  group => $appuser,
}
->
exec { "collectstatic":
  command => "python ${project_root}/manage.py collectstatic --noinput",
  path => $venvpath,
  user => $appuser,
  group => $appuser,
}

package { 'libapache2-mod-wsgi': }
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
  hasrestart => true,
}
