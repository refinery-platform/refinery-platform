node default {
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
  include stdlib
  include refinery
  include refinery::django
}
