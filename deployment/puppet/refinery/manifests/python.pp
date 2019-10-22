class refinery::python (
  $deployment_platform = $refinery::params::deployment_platform,
  $app_user            = $refinery::params::app_user,
  $app_group           = $refinery::params::app_group,
  $virtualenv          = $refinery::params::virtualenv,
  $project_root        = $refinery::params::project_root,
  $django_root         = $refinery::params::django_root,
) inherits refinery::params {


  class { '::python':
    version    => 'python3.5',
    ensure     => 'latest',
    dev        => 'latest',
    gunicorn   => 'absent',
    pip        => 'latest',
    virtualenv => 'present'
  }

  # python3.5-dev needed for cffi (c function interface)
  $base_dependencies = ['build-essential', 'libncurses5-dev', 'python3.5-dev', 'apache2-dev']
  $crypto_dependencies = ['libffi-dev', 'libssl-dev']  # cryptography module
  $pysam_dependecies = ['liblzma-dev', 'libbz2-dev', 'zlib1g-dev'] # pysam mod
  package { [$base_dependencies, $crypto_dependencies, $pysam_dependecies]:
    require => Class['apt::update']
  }

  # for psycopg2 module
  package { 'libpq5':
    ensure  => $refinery::postgresql::package_version,
    # make sure package repo is configured
    require => Class[
      'postgresql::globals',
      # https://forge.puppet.com/puppetlabs/apt/readme#adding-new-sources-or-ppas
      'apt::update'
    ],
  }
  ->
  package { 'libpq-dev':  # must install separately after downgrading libpq5
    ensure => $refinery::postgresql::package_version,
  }

  file { "/home/${app_user}/.virtualenvs":
    # workaround for parent directory /home/vagrant/.virtualenvs does not exist error
    ensure => directory,
    owner  => $app_user,
    group  => $app_group,
  }
  ->
  python::virtualenv { $virtualenv:
    version => '3.5',
    ensure  => present,
    owner   => $app_user,
    group   => $app_group,
    distribute => false,
    require => [
      Package[
        $base_dependencies,
        $crypto_dependencies,
        'libpq5',
        'libpq-dev',
        $pysam_dependecies
      ],
    ],
  }

  python::requirements { "${project_root}/requirements.txt":
    virtualenv => $virtualenv,
    owner      => $app_user,
    group      => $app_group,
    # require metaparameter does not actually trigger the installation
    subscribe  => Python::Virtualenv[$virtualenv],
  }

  if $deployment_platform == 'aws' {
    python::requirements { "${project_root}/requirements-aws.txt":
      virtualenv => $virtualenv,
      owner      => $app_user,
      group      => $app_group,
      # require metaparameter does not actually trigger the installation
      subscribe  => Python::Virtualenv[$virtualenv],
    }
  }

  exec { 'get virtualenvwrapper':
    command     => "python3 -m pip install virtualenvwrapper",
    path        => [ '/bin/', '/sbin/' , '/usr/bin/', '/usr/sbin/' ],
    user        => $app_user,
    group       => $app_group,
    require     => Python::Virtualenv[$virtualenv],
  }
  ->
  file_line { "virtualenvwrapper_config":
    path        => "/home/${app_user}/.profile",
    line        => "export VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3 && export PROJECT_HOME=/vagrant/refinery && export VIRTUALENVWRAPPER_VIRTUALENV=/usr/bin/virtualenv && export WORKON_HOME=/home/${app_user}/.virtualenv/ && source ./.local/bin/virtualenvwrapper.sh",
    require     => Python::Virtualenv[$virtualenv],
  }
  ->
  file { "virtualenvwrapper_project":
    # workaround for setvirtualenvproject command not found
    ensure  => file,
    path    => "${virtualenv}/.project",
    content => "${django_root}",
    owner   => $app_user,
    group   => $app_group,
  }
}
