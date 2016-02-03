class refinery::aws {

# Ensure formatted filesystem
# https://forge.puppetlabs.com/puppetlabs/lvm
# http://docs.puppetlabs.com/puppet/4.3/reference/types/mount.html

$fstype = 'ext3'

package { 'lvm2':
  ensure => present,
}
->
lvm::volume { 'media':
  ensure => present,
  vg     => 'mediavg',
  pv     => '/dev/xvdr',
  fstype => $fstype,
}
->
file { '/media':
  ensure => directory,
}
->
mount { '/media':
  ensure => mounted,
  device => '/dev/mediavg/media',
  fstype => $fstype,
  options => 'defaults',
}

}
