class refinery::python {

  class { '::python':
    dev        => 'present',
    pip        => 'latest',
    virtualenv => 'present',
  }

  $virtualenv_dependencies = [
    'build-essential',
    'libncurses5-dev',
    'libldap2-dev',
    'libsasl2-dev',
    'libffi-dev',  # for SSL modules
    'libpq-dev',  # for PostgreSQL
  ]
  package { $virtualenv_dependencies: }

  file { "/home/${::app_user}/.virtualenvs":
    # workaround for parent directory /home/vagrant/.virtualenvs does not exist error
    ensure => directory,
    owner  => $::app_user,
    group  => $::app_group,
  }
  ->
  python::virtualenv { $::virtualenv:
    requirements => $::requirements,
    owner   => $::app_user,
    group   => $::app_group,
    extra_pip_args  => '--no-binary :none:',
    require => Package[$virtualenv_dependencies],
  }

  package { 'virtualenvwrapper': }
  ->
  file_line { "virtualenvwrapper_config":
    path    => "/home/${::app_user}/.profile",
    line    => "source /etc/bash_completion.d/virtualenvwrapper",
    require => Python::Virtualenv[$::virtualenv],
  }
  ->
  file { "virtualenvwrapper_project":
    # workaround for setvirtualenvproject command not found
    ensure  => file,
    path    => "${::virtualenv}/.project",
    content => "${::django_root}",
    owner   => $::app_user,
    group   => $::app_group,
  }
}
