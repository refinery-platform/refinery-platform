exec { 'apt-get update':
  path => '/usr/bin',
}

#TODO: peg packages to specific versions
Package { require => Exec['apt-get update'] }
package { 'build-essential': }
package { 'libncurses5-dev': }
package { 'g++': }
package { 'git': }
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
}->
class { 'postgresql::server':
}
postgresql::db { 'refinery':
  user => 'vagrant',
  password => '',
}

class { 'python':
  version => 'system',
  pip => true,
  dev => true,
  virtualenv => true,
}

# create virtualenv
$virtualenv = "/home/vagrant/.virtualenvs/refinery-platform"
python::virtualenv { $virtualenv:
  ensure => present,
  requirements => "/vagrant/requirements.txt",
  owner => 'vagrant',
  require => Package['virtualenvwrapper'],
}

# a workaround for a bug in matplotlib installation
python::pip { 'numpy==1.7.0':
  virtualenv => $virtualenv,
  owner => 'vagrant',
}

# install packages from requirements.txt
python::requirements { '/vagrant/requirements.txt':
  virtualenv => $virtualenv,
  owner => 'vagrant',
  group => 'vagrant',
#  require => Python::Virtualenv[$virtualenv],
}
