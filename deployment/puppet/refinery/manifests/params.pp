class refinery::params (
  $deployment_platform
) {
  # based on https://docs.puppet.com/puppet/3/lang_classes.html#appendix-smart-parameter-defaults
  # all globals are set via Facter environment variables by Terraform
  $app_user = $deployment_platform ? {
    'aws'   => 'ubuntu',
    default => 'vagrant',
  }

  $app_group = $app_user

  $virtualenv = "/home/${app_user}/.virtualenvs/refinery-platform"

  $db_name = 'refinery'

  $db_user = $deployment_platform ? {
    'aws'   => $db_name,
    default => $app_user,
  }

  $db_user_password = $deployment_platform ? {
    'aws'   => fqdn_rand_string(8),
    default => undef,
  }

  $rds_superuser_password = $deployment_platform ? {
    'aws'   => $::rds_superuser_password,
    default => undef,
  }

  $rds_endpoint_address = $deployment_platform ? {
    'aws'   => $::rds_endpoint_address,
    default => undef,
  }

  $site_name = $deployment_platform ? {
    'aws'   => $::site_name,
    default => 'Refinery',
  }

  $site_url = $deployment_platform ? {
    'aws'   => $::site_url,
    default => '192.168.50.50:8000',
  }

  $refinery_url_scheme = $deployment_platform ? {
    'aws'   => $::refinery_url_scheme,
    default => 'http',
  }

  $conf_mode = $deployment_platform ? {
    'aws'   => 'aws',
    default => 'dev',
  }

  $django_settings_module = "config.settings.${conf_mode}"

  $django_admin_password = $deployment_platform ? {
    'aws'   => $::admin_password,
    default => 'refinery',
  }

  $project_root = $deployment_platform ? {
    'aws'   => '/srv/refinery-platform',
    default => "/${app_user}",
  }

  $django_root = "${project_root}/refinery"

  $ui_app_root = "${django_root}/ui"

  $data_dir = $deployment_platform ? {
    'aws'   => '/data',
    default => "${project_root}",
  }

  $import_dir = $deployment_platform ? {
    'aws'   => undef,
    default => "${data_dir}/import",
  }

  $media_root = "${data_dir}/media"

  $file_store_root = "${media_root}/file_store"

  $solr_data_dir = $deployment_platform ? {
    'aws'   => "${data_dir}/solr",
    default => undef,
  }

  $solr_data_set_manager_data = $deployment_platform ? {
    'aws'   => "${solr_data_dir}/data_set_manager",
    default => undef,
  }

  $solr_core_data = $deployment_platform ? {
    'aws'   => "${solr_data_dir}/core",
    default => undef,
  }

  $solr_custom_synonyms_file = "${django_root}/solr/core/conf/custom-synonyms.txt"

  $solr_lib_dir = $deployment_platform ? {
    'aws'   => '/opt/solr/server/solr-webapp/webapp/WEB-INF/lib',
    default => "${django_root}/solr/lib",
  }

  $email_host = $deployment_platform ? {
    'aws'   => 'email-smtp.us-east-1.amazonaws.com',
    default => 'localhost',
  }

  $email_use_tls = $deployment_platform ? {
    'aws'   => 'true',
    default => 'false',
  }

  $django_docker_engine_mem_limit_mb = $deployment_platform ? {
    # Based on t2.medium (specified in terraform/modules/docker_host/main.tf)
    # 0.5GB is probably more than enough for everything non-docker
    # (4GB - 0.5GB) * 1024MB/GB = 3584MB
    'aws'   => 3584,
    default => 20,
  }

  $docker_host = $deployment_platform ? {
    'aws'   => $::docker_host,
    default => 'tcp://127.0.0.1:2375',
  }
}
