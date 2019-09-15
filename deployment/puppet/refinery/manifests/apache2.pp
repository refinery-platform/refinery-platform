class refinery::apache2 (
  $deployment_platform = $refinery::params::deployment_platform,
  $app_user            = $refinery::params::app_user,
  $app_group           = $refinery::params::app_group,
  $refinery_url_scheme = $refinery::params::refinery_url_scheme,
  $site_url            = $refinery::params::site_url,
  $project_root        = $refinery::params::project_root,
  $django_root         = $refinery::params::django_root,
  $media_root          = $refinery::params::media_root,
  $conf_mode           = $refinery::params::conf_mode,
  $pyenv               = $refinery::params::pyenv,
) inherits refinery::params {

  # must be set to the ELB IdleTimeout value in the CloudFormation template
  # this is higher than the default of 60 to accommodate long synchronous
  # processing of metadata during data set import
  $timeout = 180  # seconds

  class { 'apache':
    default_mods           => false,  # to allow declaration of ::apache::mod::reqtimeout below
    # recommended for use with AWS ELB
    mpm_module             => 'worker',
    timeout                => $timeout + 5,
    keepalive              => 'on',
    keepalive_timeout      => $timeout + 5,
    max_keepalive_requests => 0,
    # recommended for use with AWS ELB
    # https://aws.amazon.com/premiumsupport/knowledge-center/apache-backend-elb/
    log_formats            => {
      aws-elb => '%{X-Forwarded-For}i %h %l %u %t \"%r\" %>s %b %D \"%{Referer}i\" \"%{User-Agent}i\"',
    },
  }

  class { 'apache::mod::wsgi':
    mod_path     => 'mod_wsgi.so',
    package_name => 'libapache2-mod-wsgi',
  }

  # recommended for use with AWS ELB to avoid HTTP 408 errors
  class { 'apache::mod::reqtimeout':
    timeouts => [
      "header=${ $timeout + 5 }-${ $timeout + 25 },MinRate=500",
      "body=${ $timeout + 5 },MinRate=500",
    ],
  }

  class { 'apache::mod::dir': }  # to allow ELB health checks using default vhost

  # recommended for use with AWS ELB
  apache::custom_config { 'no-acceptfilter':
    content => "AcceptFilter http none\nAcceptFilter https none",
  }

  # log Django messages only
  apache::custom_config { 'error-log-format':
    content => 'ErrorLogFormat "%M"',
  }

  if $refinery_url_scheme == 'https' {
    $rewrites = [
      {
        comment      => 'Redirect http to https unless AWS ELB terminated TLS',
        rewrite_cond => [
          '%{HTTP:X-Forwarded-Proto} !https',
          "%{HTTP_HOST} ${site_url}",  # to allow ELB health checks using default vhost
        ],
        rewrite_rule => ['^.*$ https://%{HTTP_HOST}%{REQUEST_URI} [R=302,L]'],
      },
    ]
  } else {
    $rewrites = []
  }

  $common_aliases = [
    {
      alias => '/media/',
      path  => "${media_root}/",
    }
  ]
  if $deployment_platform == 'vagrant' {
    $aliases = concat(
      $common_aliases,
      [
        {
          alias => '/static/',
          path  => "${project_root}/static/",
        },
      ]
    )
  }
  else {
    $aliases = $common_aliases
  }

  $common_directories = [
    {
      path     => "${django_root}/config/wsgi_*.py",
      provider => 'files',
    },
    {
      path => "${media_root}/",
    },
  ]
  if $deployment_platform == 'vagrant' {
    $directories = concat(
      $common_directories,
      [
        {
          path => "${project_root}/static/",
        },
      ]
    )
  }
  else {
    $directories = $common_directories
  }

  $access_log_format = $deployment_platform ? {
    'aws'   => 'aws-elb',
    default => undef,
  }

  apache::vhost { 'refinery':
    servername              => $site_url,
    vhost_name              => '*',
    port                    => 80,
    docroot                 => false,
    manage_docroot          => false,
    rewrites                => $rewrites,
    wsgi_script_aliases     => { '/' => "${django_root}/config/wsgi_${conf_mode}.py" },
    wsgi_daemon_process     => {
      'refinery' => {
        'user'        => $app_user,
        'group'       => $app_group,
        'python-path' => "${django_root}:${pyenv}/lib/python2.7/site-packages",
      }
    },
    wsgi_process_group      => 'refinery',
    wsgi_pass_authorization => 'On',
    access_log_file         => 'refinery_access.log',
    access_log_format       => $access_log_format,
    error_log_file          => 'refinery_error.log',
    aliases                 => $aliases,
    directories             => $directories,
  }
}
