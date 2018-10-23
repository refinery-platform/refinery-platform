class refinery::postgresql {
  if $::deployment_platform == 'aws' {
    $rds_settings = {
      'PGUSER'     => 'root',
      'PGPASSWORD' => $::rds_superuser_password,
      'PGHOST'     => $::rds_endpoint_address,
      'PGPORT'     => '5432',
    }
    class { '::postgresql::globals':
      version                  => "10.4",
      default_connect_settings => $rds_settings,
    }
    class { '::postgresql::server':
      encoding             => 'UTF8',
      locale               => 'en_US.UTF8',
      manage_pg_hba_conf   => false,
      manage_pg_ident_conf => false,
      manage_recovery_conf => false,
      service_manage       => false,
    }
    ->
    # create Django application user role if doesn't exist and update password
    # cannot use postgresql::server::role due to a bug
    # https://tickets.puppetlabs.com/browse/MODULES-5068
    postgresql_psql { "Create role ${::db_user}":
      command     => "CREATE ROLE ${::db_user} WITH LOGIN PASSWORD '${::db_user_password}'",
      db          => 'postgres',
      environment => join_keys_to_values($rds_settings, '='),
      unless      => "SELECT 1 FROM pg_roles WHERE rolname = '${::db_user}'",
    }
    ->
    postgresql_psql { "Update password for role ${::db_user}":
      command     => "ALTER ROLE ${::db_user} WITH PASSWORD '${::db_user_password}'",
      db          => 'postgres',
      environment => join_keys_to_values($rds_settings, '='),
    }
    ->
    ::postgresql::server::database { $::db_name:
      owner => $::db_user,
    }
    ->
    package { 'postgresql-common':
      # local server is required for RDS configuration only due to a bug
      # https://tickets.puppetlabs.com/browse/MODULES-5069
      ensure => purged,
    }
  }
  else {
    package { 'postgresql-9.3':
      ensure => purged,
    }
    ->

    class { '::postgresql::globals':
      # Postgres versioning scheme provides latest point releases when
      # specifying major version: https://www.postgresql.org/support/versioning/
      version             => "10",
      manage_package_repo => true,
    }
    ->
    class { '::postgresql::server':
      encoding => 'UTF8',
      locale   => 'en_US.UTF8',
      # to make remote connections via SSH tunnel easier
      ipv4acls => ["host all ${::db_user} 127.0.0.1/32 trust"],
    }

    ::postgresql::server::role { $::db_user:
      createdb => true,  # to allow automated testing
    }
    ->
    ::postgresql::server::db { $::db_name:
      user     => $::db_user,
      password => '',
      owner    => $::db_user,
    }
  }
}
