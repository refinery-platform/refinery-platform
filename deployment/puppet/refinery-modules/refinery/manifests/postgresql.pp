class refinery::postgresql {
    class { '::postgresql::globals':
      version  => $::postgres_version,
      encoding => 'UTF8',
      manage_package_repo => true,
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

