class refinery::python (
  $deployment_platform = $refinery::params::deployment_platform,
  $app_user            = $refinery::params::app_user,
  $app_group           = $refinery::params::app_group,
  $pyenv               = $refinery::params::pyenv,
  $project_root        = $refinery::params::project_root,
  $django_root         = $refinery::params::django_root,
) inherits refinery::params {

  # needed for python3.7 on ubuntu
  apt::ppa { 'ppa:deadsnakes/ppa': }

  class { '::python':
    version    => 'python3.7',
    ensure     => 'latest',
    dev        => 'latest',
    gunicorn   => 'absent',
    pip        => 'latest',
    virtualenv => 'latest',
    require    => Apt::Ppa['ppa:deadsnakes/ppa']
  }

  # python3.7-dev needed for cffi (c function interface)
  $base_dependencies = ['build-essential', 'libncurses5-dev', 'python3.7-dev']
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

  file { "/home/${app_user}/.pyenv":
    # workaround for parent directory /home/vagrant/.pyenv does not exist error
    ensure => directory,
    owner  => $app_user,
    group  => $app_group,
  }
  ->
  python::pyvenv { $pyenv:
    version => '3.7',
    ensure  => present,
    owner   => $app_user,
    group   => $app_group,
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
    virtualenv => $pyenv,
    owner      => $app_user,
    group      => $app_group,
    # require metaparameter does not actually trigger the installation
    subscribe  => Python::Pyvenv[$pyenv],
  }

  if $deployment_platform == 'aws' {
    python::requirements { "${project_root}/requirements-aws.txt":
      virtualenv => $pyenv,
      owner      => $app_user,
      group      => $app_group,
      # require metaparameter does not actually trigger the installation
      subscribe  => Python::Pyvenv[$pyenv],
    }
  }
}
