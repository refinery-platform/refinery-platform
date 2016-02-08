class refinery::aws {

# Ensure formatted filesystem
# https://forge.puppetlabs.com/puppetlabs/lvm
# http://docs.puppetlabs.com/puppet/4.3/reference/types/mount.html

$fstype = 'ext3'

package { 'lvm2':
  ensure => present,
}
->
lvm::volume { 'data':
  ensure => present,
  vg     => 'refinerydata',
  pv     => '/dev/xvdr',
  fstype => $fstype,
}
->
# Mountpoint
file { '/data':
  ensure => directory,
}
->
mount { '/data':
  ensure => mounted,
  device => '/dev/refinerydata/data',
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

}
