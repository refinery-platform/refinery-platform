$appuser = "vagrant"

#exec { 'apt-get update':
#  path => '/usr/bin',
#}
#Package { require => Exec['apt-get update'] }

#TODO: peg packages to specific versions
package { 'build-essential': }
package { 'libncurses5-dev': }
package { 'g++': }
package { 'libfreetype6': }  # required by matplotlib
package { 'libfreetype6-dev': }  # required by matplotlib
package { 'libpng12-dev': }  # required by matplotlib
package { 'libldap2-dev': }
package { 'libsasl2-dev': }
package { 'postgresql': }
package { 'postgresql-server-dev-all': }
package { 'rabbitmq-server': }
package { 'virtualenvwrapper': }
package { 'solr-jetty': }

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

$virtualenv = "/home/${appuser}/.virtualenvs/refinery-platform"
$requirements = "/vagrant/requirements.txt"

# create virtualenv
python::virtualenv { $virtualenv:
  ensure => present,
#  requirements => $requirements,
  owner => $appuser,
  group => $appuser,
}
->
# a workaround for a bug in matplotlib installation
exec { "numpy":
  command => "pip install numpy==1.7.0",
  path => "/home/${appuser}/.virtualenvs/refinery-platform/bin:/usr/bin:/bin",
  user => $appuser,
  group => $appuser,
}
# this doesn't work because it creates a dependency cycle
#python::pip { 'numpy==1.7.0':
#  virtualenv => $virtualenv,
#  owner => 'vagrant',
#}
~>
# install packages from requirements.txt
python::requirements { $requirements:
  virtualenv => $virtualenv,
  owner => 'vagrant',
  group => 'vagrant',
}
