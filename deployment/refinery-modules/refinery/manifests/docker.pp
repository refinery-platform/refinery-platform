class refinery::docker {
  class { '::docker':
    docker_users => [$::app_user]
  }
  if $::deployment_platform == 'aws' {
    # Add DOCKER_HOST on AWS
    file_line { "docker_host":
      path => "/home/${app_user}/.profile",
      line => "export DOCKER_HOST=${docker_host}",
    }
  }
}
