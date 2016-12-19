class refinery::geckodriver {
  $geckodriver_version = 'v0.11.1'
  $geckodriver = "geckodriver-${geckodriver_version}-linux32.tar.gz"
  $install_path = "/opt/geckodriver"

  file { $install_path:
    ensure => directory,
    owner  => $app_user,
    group  => $app_group,
    mode   => '0755',
  }
  ->
  archive { $geckodriver:
    path          => "/tmp/${geckodriver}",
    source        => "https://github.com/mozilla/geckodriver/releases/download/${geckodriver_version}/${geckodriver}",
    extract       => true,
    extract_path  => '/opt',
    creates       => "${install_path}/bin",
    cleanup       => true,
    user          => $app_user,
    group         => $app_group,
  }
}




