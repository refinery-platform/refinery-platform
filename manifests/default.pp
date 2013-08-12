$appuser = "vagrant"
$virtualenv = "/home/${appuser}/.virtualenvs/refinery-platform"
$venvpath = "${virtualenv}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/opt/vagrant_ruby/bin"
$requirements = "/vagrant/requirements.txt"

#TODO: peg packages to specific versions
class venvdeps {
  package { 'build-essential': }
  package { 'libncurses5-dev': }
  package { 'libfreetype6': }      # required by matplotlib
  package { 'libfreetype6-dev': }  # required by matplotlib
  package { 'libpng12-dev': }      # required by matplotlib
  package { 'libldap2-dev': }
  package { 'libsasl2-dev': }
  package { 'postgresql-server-dev-all': }
}
include venvdeps

package { 'postgresql': }
#package { 'virtualenvwrapper': }
#package { 'rabbitmq-server': }
#package { 'solr-jetty': }

class { 'postgresql':
  charset => 'UTF8',
  locale => 'en_US.utf8',
}
->
class { 'postgresql::server':
}
postgresql::db { 'refinery':
  user => $appuser,
  password => '',
}

class { 'python':
  version => 'system',
  pip => true,
  dev => true,
  virtualenv => true,
}
# create virtualenv
python::virtualenv { $virtualenv:
  ensure => present,
  #requirements => $requirements,  # creates a dependency cycle
  owner => $appuser,
  group => $appuser,
}
->
# a workaround for a bug in matplotlib installation
# python::pip doesn't work because it creates a dependency cycle
exec { "numpy":
  command => "pip install numpy==1.7.0",
  path => $venvpath,
  user => $appuser,
  group => $appuser,
  require => Class["venvdeps"],
}
~>
# install packages from requirements.txt
python::requirements { $requirements:
  virtualenv => $virtualenv,
  owner => 'vagrant',
  group => 'vagrant',
}
#exec { "requirements":
#  command => "pip install -U -r ${requirements}",
#  path => $venvpath,
#  user => $appuser,
#  group => $appuser,
#}

file { [ "/vagrant/media", "/vagrant/static", "/vagrant/isa-tab" ]:
  ensure => directory,
  owner => $appuser,
  group => $appuser,
}

exec { "syncdb":
  command => "/vagrant/refinery/manage.py syncdb --noinput --all",
  path => $venvpath,
  user => $appuser,
  group => $appuser,
  require => [
               File["/vagrant/media"],
               Python::Requirements[$requirements],
               Postgresql::Db["refinery"]
             ],
}
->
exec { "migrate":
  command => "/vagrant/refinery/manage.py migrate --fake",
  path => $venvpath,
  user => $appuser,
  group => $appuser,
}
->
exec { "init":
  command => "/vagrant/refinery/manage.py init_refinery 'Refinery' 'localhost:8000'",
  path => $venvpath,
  user => $appuser,
  group => $appuser,
}
