class refinery::docker {
  $_docker_host = "unix:///var/run/docker.sock"

  if $::deployment_platform == 'aws' {
    # Get docker host value from FACTER_DOCKER_HOST
    $_docker_host = "${docker_host}"
  }
  else {
    # Install docker when not on AWS
    class { '::docker':
      docker_users => [$::app_user]
    }
  }
  # Add env var pointing to docker host
  file_line { "docker_host":
    path => "/home/${::app_user}/.profile",
    line => "export DOCKER_HOST=$_docker_host",
  }
}