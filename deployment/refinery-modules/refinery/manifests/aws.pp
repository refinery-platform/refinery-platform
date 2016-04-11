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
file { '/data/isa-tab':
  ensure => directory,
  owner => "$app_user",
  group => "$app_user",
  mode => "0755",
}


python::requirements { "/srv/refinery-platform/deployment/aws-requirements.txt":
  require     => Python::Requirements[$requirements],
  virtualenv => $virtualenv,
  owner      => $app_user,
  group      => $app_group,
}

exec { "overwrite_superuser_json":
  command     => "${virtualenv}/bin/python /srv/refinery-platform/deployment/bin/generate-superuser > /srv/refinery-platform/refinery/core/fixture/superuser.json",
  environment => ["PYTHONPATH=/srv/refinery-platform/refinery",
                  "DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
  require     => Exec["syncdb"],
  before      => Exec["create_superuser"],
}

}
