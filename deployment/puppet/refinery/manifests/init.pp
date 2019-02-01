class refinery inherits refinery::params {
  sysctl { 'vm.swappiness': value => '10' }  # for better performance

  class { 'timezone':  # to make logs easier to read
    timezone => 'America/New_York',
  }

  if $deployment_platform == 'vagrant' {
    exec { 'activate_guest_user':
      command     => "${virtualenv}/bin/python ${django_root}/manage.py activate_user guest",
      environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
      user        => $app_user,
      group       => $app_group,
      require     => Exec['create_guest_user'],
    }
  }

  user { $app_user: ensure => present, }

  file { "/home/${app_user}/.ssh/config":
    ensure => file,
    source => "${project_root}/deployment/puppet/templates/ssh-config",
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

  if $deployment_platform == 'aws' {
    # Ensure formatted filesystem
    # https://forge.puppetlabs.com/puppetlabs/lvm
    # http://docs.puppetlabs.com/puppet/4.3/reference/types/mount.html
    $fstype = 'ext3'
    # This is the block device for the external data.
    # It must match the attachment point for the EC2 EBS volume.
    $block_device = '/dev/xvdr'

    filesystem { $block_device:
      ensure  => present,
      fs_type => $fstype,
    }
    ->
    file { '/data':
      ensure => directory,
    }
    ->
    mount { 'data_volume':
      name    => '/data',
      ensure  => mounted,
      device  => $block_device,
      fstype  => $fstype,
      options => 'defaults',
    }

    file { '/data/media':
      ensure  => directory,
      owner   => $app_user,
      group   => $app_group,
      mode    => '0755',
      require => Mount['data_volume'],
    }

    file { '/data/solr':
      ensure  => directory,
      owner   => $app_user,
      group   => $app_group,
      mode    => '0755',
      before  => Exec['solr_install'],
      require => Mount['data_volume'],
    }

    file { $solr_data_set_manager_data:
      ensure  => directory,
      owner   => $app_user,
      group   => $app_group,
      mode    => '0755',
      require => Mount['data_volume'],
    }

    file { $solr_core_data:
      ensure  => directory,
      owner   => $app_user,
      group   => $app_group,
      mode    => '0755',
      require => Mount['data_volume'],
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
      Class['refinery::neo4j'],
      Class['rabbitmq'],
      Service['memcached'],
    ],
  }
}
