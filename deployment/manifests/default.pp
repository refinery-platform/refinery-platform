$app_user = 'vagrant'
$app_group = $app_user
$virtualenv = "/home/${app_user}/.virtualenvs/refinery-platform"
$site_name = 'Refinery'
$site_url = '192.168.50.50:8000'
$project_root = "/${app_user}"
$deployment_root = "${project_root}/deployment"
$django_root = "${project_root}/refinery"
$requirements = "${project_root}/requirements.txt"
$isa_tab_dir = "${project_root}/isa-tab"
$media_root = "${project_root}/media"
$import_dir = "${project_root}/import"
$solr_custom_synonyms_file = "${django_root}/solr/core/conf/custom-synonyms.txt"
$solr_lib_dir = "${django_root}/solr/lib"
$conf_mode = 'dev'
$django_settings_module = "config.settings.${conf_mode}"
$ui_app_root = "${django_root}/ui"
$data_dir = '/data'
$django_docker_engine_data_dir = "${data_dir}/django-docker-engine-data"
$docker_host = "tcp://127.0.0.1:2375"

# to make logs easier to read
class { 'timezone':
  timezone => 'America/New_York',
}

# On Vagrant, it's okay to activate the 'guest' user.
exec { 'activate_user':
  command     => "${virtualenv}/bin/python ${django_root}/manage.py activate_user guest",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
  require     => Exec['create_guest'],
}

# Django-docker-engine needs a place for ephemeral data.
# In production, this is a separate EBS mount, so we don't need to create it locally.
file { $::data_dir:
  ensure => directory,
  owner  => $app_user,
  group  => $app_group
}
->
file { $::django_docker_engine_data_dir:
    ensure => directory,
    owner  => $app_user,
    group  => $app_group,
    mode   => '0755',
}

# See code in refinery-modules/refinery/...
include refinery
include refinery::apache2
include refinery::docker
include refinery::neo4j
include refinery::postgresql
include refinery::python
include refinery::selenium
include refinery::solr
