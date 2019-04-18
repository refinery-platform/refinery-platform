class refinery (
  $app_user               = $refinery::params::app_user,
  $app_group              = $refinery::params::app_group,
  $project_root           = $refinery::params::project_root,
  $django_root            = $refinery::params::django_root,
  $django_settings_module = $refinery::params::django_settings_module,
  $virtualenv             = $refinery::params::virtualenv,
  $docker_host            = $refinery::params::docker_host,
) inherits refinery::params {
  sysctl { 'vm.swappiness': value => '10' }  # for better performance

  class { 'timezone':  # to make logs easier to read
    timezone => 'America/New_York',
  }

  user { $app_user: ensure => present, }

  file { "/home/${app_user}/.ssh/config":
    ensure => file,
    source => "${project_root}/deployment/puppet/templates/ssh-config",
    owner  => $app_user,
    group  => $app_group,
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

  file { $data_dir:
    ensure => directory,
  }

  if $deployment_platform == 'aws' {
    # configure an EBS volume to store Solr indexing and user files (if not on S3)
    $file_system_type = 'ext3'

    # https://forge.puppetlabs.com/puppetlabs/lvm
    filesystem { $data_volume_device_name:
      ensure  => present,
      fs_type => $file_system_type,
      before  => File[$data_dir],
    }

    mount { $data_dir:
      ensure  => mounted,
      device  => $data_volume_device_name,
      fstype  => $file_system_type,
      options => 'defaults',
      require => File[$data_dir],
    }
  }

  file { "${django_root}/supervisord.conf":
    ensure  => file,
    content => template("${django_root}/supervisord.conf.erb"),
    owner   => $app_user,
    group   => $app_group,
  }
  ->
  exec { 'supervisord':
    command     => "${virtualenv}/bin/supervisord",
    environment => [
      "DJANGO_SETTINGS_MODULE=${django_settings_module}",
      "DOCKER_HOST=${docker_host}"
    ],
    cwd         => $django_root,
    creates     => '/tmp/supervisord.pid',
    user        => $app_user,
    group       => $app_group,
    require     => [
      Class['refinery::django'],
      Class['refinery::ui'],
      Class['refinery::solr'],
      Class['::rabbitmq'],
      Service['memcached'],
    ],
  }
}
