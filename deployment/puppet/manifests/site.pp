if $::domain == 'ec2.internal' {
  class { 'refinery::params':
    deployment_platform => 'aws',
  }
}
else {
  class { 'refinery::params':
    deployment_platform => 'vagrant',
  }
}

# class refinery_test(
#   $app_group = $refinery::params::app_group
# ) inherits refinery::params {
#   notice("${app_group}")
# }
#
# # class {'refinery_test':}
# include refinery_test

notice("${refinery::params::site_url}")
