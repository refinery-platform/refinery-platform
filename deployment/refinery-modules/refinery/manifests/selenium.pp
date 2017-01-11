class refinery::selenium {
  $geckodriver_version = 'v0.11.1'
  $filename = "geckodriver-${geckodriver_version}-linux32.tar.gz"
  $install_path = "/opt/geckodriver"

  package { "firefox":
    ensure   => 'installed',
  }
  package { "xvfb":
    ensure   => 'installed',
  }

  archive { "fetch geckodriver":
    path          => "/tmp/${filename}",
    source     => "https://github.com/mozilla/geckodriver/releases/download/$geckodriver_version/$filename",
    extract       => true,
    extract_path  => '/opt/',
    creates       => $install_path,
    user        => 'root',
    group       => 'root',
    cleanup       => 'true',
  }
  ->
  exec { "chmod geckodriver":
      command     => "sudo chmod a+x $install_path",
      path        => ['/usr/bin/', '/bin/'],
  }
  ->
  file { '/usr/bin/geckodriver':
    ensure => 'link',
    target => $install_path
  }
}
