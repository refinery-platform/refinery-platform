class refinery::postgresql {

  if $::deployment_platform == 'aws' {
    # puppetlabs-postgresql doesn't provide uninstallation functionality
    # https://forge.puppet.com/puppetlabs/postgresql/changelog#2014-09-03---supported-release-400
    package { 'postgresql-9.3':
      ensure => 'absent',
    }
  }
  else {
    class { '::postgresql::globals':
      version  => '9.3',
      encoding => 'UTF8',
      locale   => 'en_US.utf8',
    }
    ->
    class { '::postgresql::server':
      # to make remote connections via SSH tunnel easier
      ipv4acls => ["host all ${::app_user} 127.0.0.1/32 trust"],
    }

    ::postgresql::server::role { $::app_user:
      createdb => true,
    }
    ->
    ::postgresql::server::db { 'refinery':
      user     => $::app_user,
      password => '',
      owner    => $::app_user,
    }
  }
}
