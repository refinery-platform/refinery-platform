$app_user = "ubuntu"
$app_group = "ubuntu"
$virtualenv = "/home/${app_user}/.virtualenvs/refinery-platform"
$project_root = "/srv/refinery-platform"
$deployment_root = "${project_root}/deployment"
$django_root = "${project_root}/refinery"
$requirements = "${project_root}/requirements.txt"
$isa_tab_dir = "/data/isa-tab"
$media_root = "/data/media"
$import_dir = "/data/import"
$solr_custom_synonyms_file =
  "${django_root}/solr/core/conf/custom-synonyms.txt"
$solr_lib_dir = "${django_root}/solr/lib"
$email_host = "email-smtp.us-east-1.amazonaws.com"
# $email_host_user set by Facter
# $email_host_password set by Facter
$email_use_tls = "true"
$django_settings_module = "config.settings.aws"
$ui_app_root = "${django_root}/ui"
# $site_name set by Facter
# $site_url set by Facter

# solr is in the /data volume on AWS:
$solr_data_set_manager_data = "/data/solr/data_set_manager"
$solr_core_data = "/data/solr/core"

# See code in refinery-modules/refinery/...
include refinery
include refinery::pg
include refinery::aws
