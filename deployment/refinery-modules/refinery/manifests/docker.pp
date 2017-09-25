class refinery::docker {
  class { '::docker':
    docker_users => [$::app_user]
  }
}
