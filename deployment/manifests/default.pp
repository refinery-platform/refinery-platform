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
$solr_custom_synonyms_file =
  "${django_root}/solr/core/conf/custom-synonyms.txt"
$solr_lib_dir = "${django_root}/solr/lib"
$django_settings_module = "config.settings.dev"
$ui_app_root = "${django_root}/ui"
$site_name = "Refinery"
$site_url = "192.168.50.50:8000"

# to make logs easier to read
class { 'timezone':
  timezone => 'America/New_York',
}

# On Vagrant, it's okay to activate the 'guest' user.
exec { "activate_user":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py activate_user guest",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
  require     => Exec['create_user'],
}

# See code in refinery-modules/refinery/...
include refinery
include refinery::pg
