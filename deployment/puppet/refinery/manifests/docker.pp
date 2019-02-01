class refinery::docker (
  $deployment_platform = $refinery::params::deployment_platform,
  $app_user            = $refinery::params::app_user,
  $docker_host         = $refinery::params::docker_host,
) {
  if $deployment_platform != 'aws' {
    class { '::docker':
      docker_users => [$app_user],
      tcp_bind     => [$docker_host],
    }
  }

  # Add env var pointing to docker host
  file_line { 'docker_host':
    path => "/home/${app_user}/.profile",
    line => "export DOCKER_HOST=${docker_host}",
  }
}
