$app_user = 'ubuntu'
$app_group = $app_user
$virtualenv = "/home/${app_user}/.virtualenvs/refinery-platform"
$project_root = '/srv/refinery-platform'
$deployment_root = "${project_root}/deployment"
$django_root = "${project_root}/refinery"
$requirements = "${project_root}/requirements.txt"
$requirements_aws = "${project_root}/requirements-aws.txt"
$data_dir = '/data'
$isa_tab_dir = "${data_dir}/isa-tab"
$media_root = "${data_dir}/media"
$import_dir = "${data_dir}/import"
$solr_custom_synonyms_file = "${django_root}/solr/core/conf/custom-synonyms.txt"
# As per https://github.com/refinery-platform/refinery-platform/issues/1153
$solr_lib_dir = '/opt/solr/server/solr-webapp/webapp/WEB-INF/lib'
$email_host = 'email-smtp.us-east-1.amazonaws.com'
$email_use_tls = 'true'
$conf_mode = 'aws'
$django_settings_module = "config.settings.${conf_mode}"
$ui_app_root = "${django_root}/ui"
# solr is in the /data volume on AWS:
$solr_data_set_manager_data = "${data_dir}/solr/data_set_manager"
$solr_core_data = "${data_dir}/solr/core"
$django_docker_engine_data_dir = "${data_dir}/django-docker-engine-data"

$deployment_platform = 'aws'

# set by Facter:
# $email_host_user, $email_host_password, $site_name, $site_url, $docker_host

# See code in refinery-modules/refinery/...
include refinery
include refinery::apache2
include refinery::aws
include refinery::docker
include refinery::neo4j
include refinery::postgresql
include refinery::python
include refinery::solr
