class refinery::params ($deployment_platform) {
  # based on https://docs.puppet.com/puppet/3/lang_classes.html#appendix-smart-parameter-defaults
  $app_user  = $deployment_platform ? {
    'aws'   => 'ubuntu',
    default => 'vagrant',
  }

  $app_group = $app_user

  $db_name   = 'refinery'

  $db_user   = $deployment_platform ? {
    'aws'   => $db_name,
    default => $app_user,
  }

  $db_user_password = $deployment_platform ? {
    'aws'   => fqdn_rand_string(8),
    default => undef,
  }

  $virtualenv = "/home/${app_user}/.virtualenvs/refinery-platform"

  $site_name = $deployment_platform ? {
    'aws'   => $::site_name,
    default => 'Refinery',
  }

  $site_url  = $deployment_platform ? {
    'aws'   => $::site_url,
    default => '192.168.50.50:8000',
  }

  $project_root = $deployment_platform ? {
    'aws'   => '/srv/refinery-platform',
    default => "/${app_user}",
  }

  $deployment_root  = "${project_root}/deployment"

  $django_root      = "${project_root}/refinery"

  $requirements     = "${project_root}/requirements.txt"

  $requirements_aws = $deployment_platform ? {
    'aws'   => "${project_root}/requirements-aws.txt",
    default => undef,
  }

  $media_root = "${project_root}/media"

# $import_dir = "${project_root}/import"
# $solr_custom_synonyms_file = "${django_root}/solr/core/conf/custom-synonyms.txt"
# $solr_lib_dir = "${django_root}/solr/lib"
# $conf_mode = 'dev'
# $django_settings_module = "config.settings.${conf_mode}"
# $ui_app_root = "${django_root}/ui"
# $django_docker_engine_mem_limit_mb = 20
# $docker_host = "tcp://127.0.0.1:2375"

}
