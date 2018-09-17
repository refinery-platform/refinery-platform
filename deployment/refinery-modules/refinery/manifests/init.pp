class refinery {

# for better performance
sysctl { 'vm.swappiness': value => '10' }

user { $::app_user: ensure => present, }

file { "/home/${app_user}/.ssh/config":
  ensure => file,
  source => "${deployment_root}/ssh-config",
  owner  => $app_user,
  group  => $app_group,
}

file { ["${project_root}/isa-tab", "${project_root}/import", "${project_root}/static"]:
  ensure => directory,
  owner  => $app_user,
  group  => $app_group,
}

file_line { "django_settings_module":
  path => "/home/${app_user}/.profile",
  line => "export DJANGO_SETTINGS_MODULE=${django_settings_module}",
}
->
file { "${django_root}/config/config.json":
  ensure  => file,
  content => template("${django_root}/config/config.json.erb"),
  owner   => $app_user,
  group   => $app_group,
  replace => false,
}
->
exec { "migrate":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py migrate --noinput --fake-initial",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
  logoutput   => true,
  require     => [
    Class['::refinery::python'],
    Class['::refinery::postgresql']
  ],
}
->
exec { "create_superuser":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py loaddata superuser.json",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
  require     => Exec['migrate'],
}
->
exec { "create_guest":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py loaddata guest.json",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
}
->
exec { "add_users_to_public_group":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py add_users_to_public_group",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
}
->
exec { "set_up_refinery_site_name":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py set_up_site_name '${site_name}' '${site_url}'",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
}
->

file { "/opt":
  ensure => directory,
}

include '::rabbitmq'

class ui {
  apt::source { 'nodejs':
    ensure      => 'present',
    comment     => 'Nodesource NodeJS repo.',
    location    => 'https://deb.nodesource.com/node_6.x',
    release     => 'trusty',
    repos       => 'main',
    key         => {
      'id'     => '9FD3B784BC1C6FC31A8A0A1C1655A0AB68576280',
      'server' => 'keyserver.ubuntu.com',
    },
    include => {
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
    'bower': ensure => '1.8.2', provider => 'npm';
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
  exec { "bower_modules":
    command     => "/bin/rm -rf ${ui_app_root}/bower_components && /usr/bin/bower install --config.interactive=false",
    cwd         => $ui_app_root,
    logoutput   => on_failure,
    user        => $app_user,
    group       => $app_group,
    environment => ["HOME=/home/${app_user}"],
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
  exec { "collectstatic":
    command     => "${virtualenv}/bin/python ${django_root}/manage.py collectstatic --clear --noinput",
    environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
    user        => $app_user,
    group       => $app_group,
    require     => Class['::refinery::python'],
  }
}
include ui

package { 'memcached': }
->
service { 'memcached':
  ensure => running,
}

file { "${django_root}/supervisord.conf":
  ensure  => file,
  content => template("${django_root}/supervisord.conf.erb"),
  owner   => $app_user,
  group   => $app_group,
}
->
exec { "supervisord":
  command     => "${virtualenv}/bin/supervisord",
  environment => [
    "DJANGO_SETTINGS_MODULE=${::django_settings_module}",
    "DOCKER_HOST=${::docker_host}"
  ],
  cwd         => $django_root,
  creates     => "/tmp/supervisord.pid",
  user        => $app_user,
  group       => $app_group,
  require     => [
    Class["ui"],
    Class["solr"],
    Class["neo4j"],
    Class["::rabbitmq"],
    Service["memcached"],
  ],
}
}
