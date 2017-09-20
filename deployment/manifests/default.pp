$app_user = "vagrant"
$app_group = $app_user
$virtualenv = "/home/${app_user}/.virtualenvs/refinery-platform"
$project_root = "/${app_user}"
$deployment_root = "${project_root}/deployment"
$django_root = "${project_root}/refinery"
$requirements = "${project_root}/requirements.txt"
$isa_tab_dir = "${project_root}/isa-tab"
$media_root = "${project_root}/media"
$import_dir = "${project_root}/import"
$data_dir = '/data'
$docker_dir = "${data_dir}/docker"
$solr_dir = "${data_dir}/solr"
$solr_custom_synonyms_file = "${django_root}/solr/core/conf/custom-synonyms.txt"
$solr_lib_dir = "${django_root}/solr/lib"
$solr_data_set_manager_data = "${data_dir}/solr/data_set_manager"
$solr_core_data = "${data_dir}/solr/core"
$conf_mode = "dev"
$django_settings_module = "config.settings.${conf_mode}"
$ui_app_root = "${django_root}/ui"
$site_name = "Refinery"
$site_url = "192.168.50.50:8000"

# See code in refinery-modules/refinery/...
include refinery
include refinery::apache2
include refinery::docker
include refinery::neo4j
include refinery::postgresql
include refinery::python
include refinery::selenium
include refinery::solr
include refinery::storage
