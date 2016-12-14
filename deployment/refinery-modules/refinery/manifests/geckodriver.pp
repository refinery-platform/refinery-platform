class refinery::geckodriver {
  exec { "fetch geckodriver":
      command     => "sudo wget -q https://github.com/mozilla/geckodriver/releases/download/v0.11.1/geckodriver-v0.11.1-linux32.tar.gz",
      cwd         => "/usr/bin/",
      user        => $app_user,
      group       => $app_group,
      path        => ['/usr/bin/'],
      timeout     => 1800,
  }
  ->
  exec { "decompress geckodriver":
      command     => "yes n | sudo gunzip geckodriver-v0.11.1-linux32.tar.gz && tar -xvf geckodriver-v0.11.1-linux32.tar",
      cwd         => "/usr/bin/",
      path        => ['/usr/bin/', '/bin/'],
  }
  ->
  exec { "remove geckdriver tarball":
      command     => "sudo rm -rf geckodriver-v0.11.1-linux32.tar",
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
