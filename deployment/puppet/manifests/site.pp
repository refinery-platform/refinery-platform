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

  include refinery
  include refinery::apache2
  include refinery::django
  include refinery::docker
  include refinery::postgresql
  include refinery::python
  include refinery::solr
  include refinery::ui
}
