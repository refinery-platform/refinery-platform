class refinery::aws {

# Ensure formatted filesystem
# https://forge.puppetlabs.com/puppetlabs/lvm
# http://docs.puppetlabs.com/puppet/4.3/reference/types/mount.html

$fstype = 'ext3'

# This is the block device for the external data.
# It must match the attachment point for the EC2 EBS volume.
$block_device = '/dev/xvdr'

filesystem { $block_device:
  ensure => present,
  fs_type => $fstype,
}
->
# Mountpoint
file { '/data':
  ensure => directory,
}
->
mount { '/data':
  ensure => mounted,
  device => $block_device,
  fstype => $fstype,
  options => 'defaults',
}
->
file { '/data/media':
  ensure => directory,
  owner => "$app_user",
  group => "$app_user",
  mode => "0755",
}
->
file { '/data/import':
  ensure => directory,
  owner => "$app_user",
  group => "$app_user",
  mode => "0755",
}
->
file { '/data/isa-tab':
  ensure => directory,
  owner => "$app_user",
  group => "$app_user",
  mode => "0755",
}
->
file { "/data/solr":
  ensure => directory,
  owner => "$app_user",
  group => "$app_user",
  mode => "0755",
  before => Exec["solr_install"],
}
->
file { "$solr_data_set_manager_data":
  ensure => directory,
  owner => "$app_user",
  group => "$app_user",
  mode => "0755",
}
->
file { "$solr_core_data":
  ensure => directory,
  owner => "$app_user",
  group => "$app_user",
  mode => "0755",
}
->
file { $::django_docker_engine_data_dir:
    ensure => directory,
    owner => "$app_user",
    group => "$app_user",
    mode => "0755",
}

exec { "generate_superuser_json":
  command     => "${virtualenv}/bin/python /srv/refinery-platform/deployment/bin/generate-superuser > /srv/refinery-platform/refinery/core/fixtures/superuser.json.new",
  environment => ["PYTHONPATH=/srv/refinery-platform/refinery",
                  "DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
  require     => Exec["migrate"],
  before      => Exec["create_superuser"],
}
->
exec { "copy_superuser_json":
  command     => "/bin/cp /srv/refinery-platform/refinery/core/fixtures/superuser.json.new /srv/refinery-platform/refinery/core/fixtures/superuser.json",
  user        => $app_user,
  group       => $app_group,
  before      => Exec["create_superuser"],
}



}
