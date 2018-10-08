$app_user = 'travis'
$app_group = $app_user
$virtualenv = "/home/${app_user}/.virtualenvs/refinery-platform"
$site_name = 'Refinery'
$site_url = '127.0.0.1:8000'
$project_root = "/${app_user}"
$deployment_root = "${project_root}/deployment"
$django_root = "${project_root}/refinery"
$requirements = "${project_root}/requirements.txt"
$isa_tab_dir = "${project_root}/isa-tab"
$media_root = "${project_root}/media"
$import_dir = "${project_root}/import"
$solr_custom_synonyms_file = "${django_root}/solr/core/conf/custom-synonyms.txt"
$solr_lib_dir = "${django_root}/solr/lib"
$conf_mode = 'prod'
$django_settings_module = "config.settings.${conf_mode}"
$ui_app_root = "${django_root}/ui"
$django_docker_engine_mem_limit_mb = 20
$docker_host = "tcp://127.0.0.1:2375"
$postgres_version = "10"

$deployment_platform = 'travis'

# to make logs easier to read
class { 'timezone':
  timezone => 'America/New_York',
}

# See code in refinery-modules/refinery/...
include refinery
include refinery::apache2
include refinery::docker
include refinery::neo4j
include refinery::postgresql
include refinery::python
include refinery::solr
