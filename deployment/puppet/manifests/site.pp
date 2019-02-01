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

  class { 'refinery': }

  class { 'refinery::python': }

  class { 'refinery::postgresql': }

  class { 'refinery::django': }

  class { 'refinery::ui': }

  class { 'refinery::solr': }

  class { 'refinery::neo4j': }

  class { 'refinery::docker': }
}
