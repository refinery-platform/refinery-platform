class refinery inherits refinery::params {
  sysctl { 'vm.swappiness': value => '10' }  # for better performance

  user { $app_user: ensure => present, }

  file { "/home/${app_user}/.ssh/config":
    ensure => file,
    source => "${deployment_root}/puppet/templates/ssh-config",
    owner  => $app_user,
    group  => $app_group,
  }

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
