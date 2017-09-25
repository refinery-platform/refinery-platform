class refinery::docker {
  class { '::docker':
    docker_users => [$::app_user]
  }
  ->
  file { $::django_docker_engine_data_dir:
      ensure => directory,
      owner => "$app_user",
      group => "$app_user",
      mode => "0755",
  }
}
