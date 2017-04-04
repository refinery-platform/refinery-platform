class refinery::docker_ {
  class { 'docker':
    docker_users => [$app_user]
  }
}
