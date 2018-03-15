class refinery::apache2 {

  # must be set to the ELB IdleTimeout value in the CloudFormation template
  # this is higher than the default of 60 to accommodate long synchronous
  # processing of metadata during data set import
  $timeout = 180  # seconds

  class { '::apache':
    default_mods           => false,  # to allow declaration of ::apache::mod::reqtimeout below
    # recommended for use with AWS ELB
    mpm_module             => 'worker',
    timeout                => $refinery::apache2::timeout + 5,
    keepalive              => 'on',
    keepalive_timeout      => $refinery::apache2::timeout + 5,
    max_keepalive_requests => 0,
    # recommended for use with AWS ELB
    # https://aws.amazon.com/premiumsupport/knowledge-center/apache-backend-elb/
    log_formats            => {
      aws-elb => '%{X-Forwarded-For}i %h %l %u %t \"%r\" %>s %b %D \"%{Referer}i\" \"%{User-Agent}i\"',
    },
  }

  class { '::apache::mod::wsgi':
    mod_path     => 'mod_wsgi.so',
    package_name => 'libapache2-mod-wsgi',
  }

  # recommended for use with AWS ELB to avoid HTTP 408 errors
  class { '::apache::mod::reqtimeout':
    timeouts => [
      "header=${ $refinery::apache2::timeout + 5 }-${ $refinery::apache2::timeout + 25 },MinRate=500",
      "body=${ $refinery::apache2::timeout + 5 },MinRate=500",
    ],
  }

  class { '::apache::mod::dir': }  # to allow ELB health checks using default vhost

  # recommended for use with AWS ELB
  apache::custom_config { 'no-acceptfilter':
    content => "AcceptFilter http none\nAcceptFilter https none",
  }

  # log Django messages only
  apache::custom_config { 'error-log-format':
    content => 'ErrorLogFormat "%M"',
  }

  if $::tls_rewrite == 'true' {
    $rewrites = [
      {
        comment      => 'Redirect http to https unless AWS ELB terminated TLS',
        rewrite_cond => [
          '%{HTTP:X-Forwarded-Proto} !https',
          "%{HTTP_HOST} ${::site_url}",  # to allow ELB health checks using default vhost
        ],
        rewrite_rule => ['^.*$ https://%{HTTP_HOST}%{REQUEST_URI} [R=302,L]'],
      },
    ]
  }

  $aliases = [
    {
      alias => '/media/',
      path  => "${::media_root}/",
    }
  ]

  $directories = [
    {
      path     => "${::django_root}/config/wsgi_*.py",
      provider => 'files',
    },
    {
      path => "${::media_root}/",
    },
  ]

  apache::vhost { 'refinery':
    servername                  => $::site_url,
    vhost_name                  => '*',
    port                        => 80,
    docroot                     => false,
    manage_docroot              => false,
    rewrites                    => $rewrites,
    wsgi_script_aliases         => { '/' => "${::django_root}/config/wsgi_${::conf_mode}.py" },
    wsgi_daemon_process         => 'refinery',
    wsgi_daemon_process_options => {
      user        => $::app_user,
      group       => $::app_group,
      python-path => "${::django_root}:${::virtualenv}/lib/python2.7/site-packages",
    },
    wsgi_process_group          => 'refinery',
    access_log_file             => 'refinery_access.log',
    access_log_format           => $::deployment_platform ? {
      'aws'   => 'aws-elb',
      default => undef,
    },
    error_log_file              => 'refinery_error.log',
    aliases                     => $::deployment_platform ? {
      'aws'   => $aliases,
      default => concat(
        $aliases,
        [
          {
            aliasmatch => '^/([^/]*\.css)',
            path       => "${::django_root}/static/styles/\$1",
          },
          {
            alias => '/static/',
            path  => "${::project_root}/static/",
          },
        ]
      ),
    },
    directories                 => $::deployment_platform ? {
      'aws'   => $directories,
      default => concat(
        $directories,
        [
          {
            path => "${::project_root}/static/",
          },
        ]
      ),
    },
  }
}
