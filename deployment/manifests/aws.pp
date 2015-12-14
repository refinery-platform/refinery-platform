$app_user = "ubuntu"
$app_group = "ubuntu"
$virtualenv = "/home/${app_user}/.virtualenvs/refinery-platform"
$source_root = "/srv/refinery-platform"
$project_root = "${source_root}/refinery"
$requirements = "${source_root}/requirements.txt"
$django_settings_module = "config.settings.dev"
$ui_app_root = "${project_root}/ui"

include refinery
