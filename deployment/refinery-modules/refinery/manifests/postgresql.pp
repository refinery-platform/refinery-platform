class refinery::postgresql {
  $server_version = '9.3'

  if $::deployment_platform == 'aws' {
    $django_role = 'refinery'
    $rds_settings = {
      'PGUSER'     => 'root',
      'PGPASSWORD' => $::rds_superuser_password,
      'PGHOST'     => $::rds_endpoint_address,
      'PGPORT'     => '5432',
    }
    class { '::postgresql::globals':
      version                  => $server_version,
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
    postgresql_psql { $django_role:
      # cannot use postgresql::server::role due to a bug
      # https://tickets.puppetlabs.com/browse/MODULES-5068
      command     => "CREATE ROLE ${django_role} LOGIN PASSWORD 'password'",
      db          => 'postgres',
      environment => join_keys_to_values($rds_settings, '='),
      unless      => "SELECT 1 FROM pg_roles WHERE rolname = '${django_role}'",
    }
    ::postgresql::server::database { 'refinery':
      owner => $django_role,
    }
    ->
    package { 'postgresql-common':
      # local server is required for RDS configuration only due to a bug
      # https://tickets.puppetlabs.com/browse/MODULES-5069
      ensure => purged,
    }
  }
  else {
    class { '::postgresql::globals':
      version  => $server_version,
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
