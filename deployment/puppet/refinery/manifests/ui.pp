class refinery::ui (
  $deployment_platform    = $refinery::params::deployment_platform,
  $project_root           = $refinery::params::project_root,
  $ui_app_root            = $refinery::params::ui_app_root,
  $app_user               = $refinery::params::app_user,
  $app_group              = $refinery::params::app_group,
  $pyenv                  = $refinery::params::pyenv,
  $django_root            = $refinery::params::django_root,
  $django_settings_module = $refinery::params::django_settings_module,
) inherits refinery::params {
  if $deployment_platform == 'vagrant' {
    file { 'static_files_dir':
      ensure => directory,
      path   => "${project_root}/static",
      owner  => $app_user,
      group  => $app_group,
    }
  }

  apt::source { 'nodejs':
    ensure   => 'present',
    comment  => 'Nodesource NodeJS repo',
    location => 'https://deb.nodesource.com/node_10.x',
    release  => 'trusty',
    repos    => 'main',
    key      => {
      'id'     => '9FD3B784BC1C6FC31A8A0A1C1655A0AB68576280',
      'server' => 'keyserver.ubuntu.com',
    },
    include  => {
      'src' => true,
      'deb' => true,
    },
  }
  ->
  package { 'nodejs':
    name    => 'nodejs',
    ensure  => latest,
    # https://forge.puppet.com/puppetlabs/apt/readme#adding-new-sources-or-ppas
    require => Class['apt::update'],
  }
  ->
  package {
    'grunt-cli': ensure => '0.1.13', provider => 'npm';
  }
  ->
  exec { "npm_prune_local_modules":
    command   => "/usr/bin/npm prune --progress false",
    cwd       => $ui_app_root,
    logoutput => on_failure,
    user      => $app_user,
    group     => $app_group,
  }
  ->
  exec { "npm_install_local_modules":
    command   => "/usr/bin/npm install --progress false",
    cwd       => $ui_app_root,
    logoutput => on_failure,
    user      => $app_user,
    group     => $app_group,
  }
  ->
  exec { "grunt":
    command   => "/usr/bin/grunt make",
    cwd       => $ui_app_root,
    logoutput => on_failure,
    user      => $app_user,
    group     => $app_group,
  }
  ->
  exec { 'collectstatic':
    command     => "${pyenv}/bin/python ${django_root}/manage.py collectstatic --clear --noinput",
    environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
    user        => $app_user,
    group       => $app_group,
    require     => $deployment_platform ? {
      'aws'   => Class['refinery::python'],
      default => [
        Class['refinery::python'],
        File['static_files_dir'],
      ]
    }
  }
}
