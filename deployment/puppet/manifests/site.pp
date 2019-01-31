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

  class { 'refinery::python':
    deployment_platform => $refinery::params::deployment_platform,
    app_user            => $refinery::params::app_user,
    app_group           => $refinery::params::app_group,
    virtualenv          => $refinery::params::virtualenv,
    project_root        => $refinery::params::project_root,
    django_root         => $refinery::params::django_root,
  }

  class { 'refinery::postgresql':
    deployment_platform    => $refinery::params::deployment_platform,
    db_name                => $refinery::params::db_name,
    db_user                => $refinery::params::db_user,
    db_user_password       => $refinery::params::db_user_password,
    rds_superuser_password => $refinery::params::rds_superuser_password,
    rds_endpoint_address   => $refinery::params::rds_endpoint_address,
  }

  class { 'refinery::ui':
    ui_app_root            => $refinery::params::ui_app_root,
    app_user               => $refinery::params::app_user,
    app_group              => $refinery::params::app_group,
    virtualenv             => $refinery::params::virtualenv,
    django_root            => $refinery::params::django_root,
    django_settings_module => $refinery::params::django_settings_module,
  }

  class { 'refinery::solr':
    deployment_platform => $refinery::params::deployment_platform,
    app_user            => $refinery::params::app_user,
    django_root         => $refinery::params::django_root,
    solr_lib_dir        => $refinery::params::solr_lib_dir,
  }
}
