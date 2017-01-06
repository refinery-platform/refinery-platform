class refinery::selenium {
  $geckodriver_version = 'v0.11.1'
  $geckodriver = "geckodriver-${geckodriver_version}-linux32.tar.gz"
  package { "firefox":
    ensure   => 'installed',
  }
  package { "xvfb":
    ensure   => 'installed',
  }
  exec { "fetch geckodriver":
      command     => "sudo wget -q https://github.com/mozilla/geckodriver/releases/download/$geckodriver_version/$geckodriver",
      cwd         => "/usr/bin/",
      user        => $app_user,
      group  => $app_group,
      path        => ['/usr/bin/'],
      timeout     => 600,
  }
  ->
  exec { "decompress geckodriver":
      command     => "sudo tar -xzvf $geckodriver",
      cwd         => "/usr/bin/",
      path        => ['/usr/bin/', '/bin/'],
  }
  ->
  exec { "remove geckdriver tarball":
      command     => "sudo rm -rf $geckodriver",
      cwd         => "/usr/bin/",
      path        => ['/usr/bin/', '/bin/'],
    }
  ->
  exec { "chmod geckodriver":
      command     => "sudo chmod a+x geckodriver",
      cwd         => "/usr/bin/",
      path        => ['/usr/bin/', '/bin/'],
  }
}
