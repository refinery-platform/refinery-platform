class refinery::docker {
  if $::deployment_platform == 'aws' {
    # Add env var pointing to remote docker host
    file_line { "docker_host":
      path => "/home/${app_user}/.profile",
      line => "export DOCKER_HOST=${docker_host}",
    }
  }
  else {
    # Install docker when not on AWS
    class { '::docker':
      docker_users => [$::app_user]
    }
  }
}