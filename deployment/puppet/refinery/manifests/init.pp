class refinery inherits refinery::params {
# for better performance
sysctl { 'vm.swappiness': value => '10' }

user { $app_user: ensure => present, }

file { "/home/${app_user}/.ssh/config":
  ensure => file,
  source => "${deployment_root}/puppet/templates/ssh-config",
  owner  => $app_user,
  group  => $app_group,
}

file { ["${project_root}/import", "${project_root}/static"]:
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

# workaround for CloudFront error 523 Origin Unreachable for https://www.rabbitmq.com/rabbitmq-release-signing-key.asc
class { '::rabbitmq':
  package_gpg_key  => 'https://github.com/rabbitmq/signing-keys/releases/download/2.0/rabbitmq-release-signing-key.asc',
}

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
