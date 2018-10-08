class refinery::postgresql-aws {
  # puppetlabs-postgresql doesn't provide uninstallation functionality
  # https://forge.puppet.com/puppetlabs/postgresql/changelog#2014-09-03---supported-release-400
  package { "postgresql-${::postgres_version}":
    ensure => 'absent',
  }
}