class refinery::python {

  class { '::python':
    dev        => 'present',
    gunicorn   => 'absent',
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
    ensure  => present,
    owner   => $::app_user,
    group   => $::app_group,
    require => Package[$virtualenv_dependencies],
  }

  python::requirements { $::requirements:
    virtualenv => $::virtualenv,
    owner      => $::app_user,
    group      => $::app_group,
    # require metaparameter does not actually trigger the installation
    subscribe  => Python::Virtualenv[$::virtualenv],
  }

  if $::deployment_platform == 'aws' {
    python::requirements { $::requirements_aws:
      virtualenv => $::virtualenv,
      owner      => $::app_user,
      group      => $::app_group,
      # require metaparameter does not actually trigger the installation
      subscribe  => Python::Virtualenv[$::virtualenv],
    }
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
