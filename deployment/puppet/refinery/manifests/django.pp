class refinery::django (
  $deployment_platform,
  $app_user,
  $app_group,
  $project_root,
  $django_root,
  $django_settings_module,
  $django_admin_password,
  $site_name,
  $site_url,
  $virtualenv,
) {
  if $deployment_platform == 'vagrant' {
    file { "${project_root}/import":
      ensure => directory,
      owner  => $app_user,
      group  => $app_group,
    }
  }

  file_line { "django_settings_module":
    path => "/home/${app_user}/.profile",
    line => "export DJANGO_SETTINGS_MODULE=${django_settings_module}",
  }
  ->
  file { "${django_root}/config/config.json":
    ensure  => file,
    content => template("${django_root}/config/config.json.erb"),
    owner   => $app_user,
    group   => $app_group,
    replace => false,
  }
  ->
  exec { 'migrate':
    command     => "${virtualenv}/bin/python ${django_root}/manage.py migrate --noinput --fake-initial",
    environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
    user        => $app_user,
    group       => $app_group,
    logoutput   => true,
    require     => [
      Class['refinery::python'],
      Class['refinery::postgresql']
    ],
  }
  ->
  exec { 'create_superuser':
    command     => "${virtualenv}/bin/python ${django_root}/manage.py loaddata superuser.json",
    environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
    user        => $app_user,
    group       => $app_group,
  }
  ->
  exec { 'create_guest_user':
    command     => "${virtualenv}/bin/python ${django_root}/manage.py loaddata guest.json",
    environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
    user        => $app_user,
    group       => $app_group,
  }
  ->
  exec { 'add_users_to_public_group':
    command     => "${virtualenv}/bin/python ${django_root}/manage.py add_users_to_public_group",
    environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
    user        => $app_user,
    group       => $app_group,
  }
  ->
  exec { 'set_up_refinery_site_name':
    command     => "${virtualenv}/bin/python ${django_root}/manage.py set_up_site_name '${site_name}' '${site_url}'",
    environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
    user        => $app_user,
    group       => $app_group,
  }

  if $deployment_platform == 'aws' {
    exec { 'generate_superuser_json':
      command     => "${virtualenv}/bin/python ${project_root}/deployment/bin/generate-superuser > ${django_root}/core/fixtures/superuser.json.new",
      environment => [
        "PYTHONPATH=${django_root}",
        "DJANGO_SETTINGS_MODULE=${django_settings_module}",
        "ADMIN_PASSWORD=${django_admin_password}"
      ],
      user    => $app_user,
      group   => $app_group,
      require => Exec['migrate'],
      before  => Exec['create_superuser'],
    }
    ->
    exec { 'copy_superuser_json':
      command => "/bin/cp ${django_root}/core/fixtures/superuser.json.new ${django_root}/core/fixtures/superuser.json",
      user    => $app_user,
      group   => $app_group,
      before  => Exec['create_superuser'],
    }
  }
}
