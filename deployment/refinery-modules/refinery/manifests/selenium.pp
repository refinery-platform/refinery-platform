class refinery::selenium {
  $geckodriver_version = 'v0.17.0'
  $filename = "geckodriver-${geckodriver_version}-linux64.tar.gz"
  $install_path = "/opt/geckodriver"

  package { "firefox":}
  package { "xvfb":}

  archive { "fetch geckodriver":
    path          => "/tmp/${filename}",
    source     => "https://github.com/mozilla/geckodriver/releases/download/$geckodriver_version/$filename",
    extract       => true,
    extract_path  => '/opt/',
    user        => 'root',
    group       => 'root',
  }
  ->
  file { '/usr/bin/geckodriver':
    ensure => 'link',
    target => $install_path
  }
}