class refinery::apache2 {

  class { 'apache':
    # recommended for use with AWS ELB
    mpm_module => 'worker',
    # recommended for use with AWS ELB
    # for chunked uploads of large files (MD5 calculation on the server can take a long time)
    # to be adjusted back to recommended values after adding support for S3
    timeout    => 1805,  # should be set higher than the ELB IdleTimeout
  }

  class { 'apache::mod::wsgi':
    mod_path     => 'mod_wsgi.so',
    package_name => 'libapache2-mod-wsgi',
  }

  # recommended for use with AWS ELB
  apache::custom_config { 'no-acceptfilter':
    content => "AcceptFilter http none\nAcceptFilter https none",
  }

  apache::vhost { 'refinery':
    servername                  => $site_url,
    vhost_name                  => '*',
    port                        => 80,
    docroot                     => false,
    manage_docroot              => false,
    wsgi_script_aliases         => { '/' => "${django_root}/config/wsgi_dev.py" },
    wsgi_daemon_process         => 'refinery',
    wsgi_daemon_process_options => {
      user        => $app_user,
      group       => $app_group,
      python-path => "${django_root}:${virtualenv}/lib/python2.7/site-packages",
    },
    wsgi_process_group          => 'refinery',
    access_log_file             => 'refinery_access.log',
    error_log_file              => 'refinery_error.log',
    aliases                     => [
      {
        aliasmatch => '^/([^/]*\.css)',
        path       => "${django_root}/static/styles/\$1",
      },
      {
        alias => '/static/',
        path  => "${project_root}/static/",
      },
      {
        alias => '/media/',
        path  => "${media_root}/",
      }
    ],
    directories                 => [
      {
        path     => "${django_root}/config/wsgi_*.py",
        provider => 'files',
      },
      {
        path => "${project_root}/static/",
      },
      {
        path => "${media_root}/",
      },
    ],
    # recommended for use with AWS ELB
    # for chunked uploads of large files (MD5 calculation on the server can take a long time)
    # to be adjusted back to recommended values after adding support for S3
    keepalive                   => 'on',
    keepalive_timeout           => 1805,  # should be set higher than the ELB IdleTimeout
    max_keepalive_requests      => 0,
  }
}
