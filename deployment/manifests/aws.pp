$app_user = "ubuntu"
$app_group = "ubuntu"
$db_password = "password"
$virtualenv = "/home/${app_user}/.virtualenvs/refinery-platform"
$project_root = "/srv/refinery-platform"
$deployment_root = "${project_root}/deployment"
$django_root = "${project_root}/refinery"
$requirements = "${project_root}/requirements.txt"
$django_settings_module = "config.settings.dev"
$ui_app_root = "${django_root}/ui"

# See code in refinery-modules/refinery/...
include refinery
