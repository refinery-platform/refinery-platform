class refinery::postgresql {

  if $::deployment_platform == 'aws' {
    class { '::postgresql::server':
      package_ensure => 'absent',
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
      ipv4acls => ["host all $::app_user 127.0.0.1/32 trust"],
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
