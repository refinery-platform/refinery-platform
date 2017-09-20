class refinery::storage {

  file { [ '/opt', $::data_dir ]:
    ensure => directory,
  }

  if $::deployment_platform == 'aws' {
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
    mount { $::data_dir:
      ensure  => mounted,
      device  => $block_device,
      fstype  => $fstype,
      options => 'defaults',
      require => File[$::data_dir],
    }
  }

  file { [
    $::media_root,
    $::import_dir,
    $::isa_tab_dir,
    $::solr_dir,
    $::solr_core_data,
    $::solr_data_set_manager_data,
    $::docker_dir,
  ]:
    ensure  => directory,
    owner   => $::app_user,
    group   => $::app_group,
    mode    => '0755',
    require => $::deployment_platform ? {
      'aws' => Mount[$::data_dir],
      default => File[$::data_dir],
    }
  }
}
