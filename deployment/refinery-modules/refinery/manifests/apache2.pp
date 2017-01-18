class refinery::apache2 {

  # must be set to the ELB Idle Timeout value provided in the CloudFormation template
  # for chunked uploads of large files (MD5 calculation on the server can take a long time)
  # to be adjusted to a more reasonable value after enabling file uploads to S3
  $timeout = 1800

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

  if $tls_rewrite == 'true' {
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
  }

  # change log format if deploying on AWS
  if $::domain == 'ec2.internal' {
    $log_format = 'aws-elb'
  }

  apache::vhost { 'refinery':
    servername                  => $site_url,
    vhost_name                  => '*',
    port                        => 80,
    docroot                     => false,
    manage_docroot              => false,
    rewrites                    => $rewrites,
    wsgi_script_aliases         => { '/' => "${django_root}/config/wsgi_${conf_mode}.py" },
    wsgi_daemon_process         => 'refinery',
    wsgi_daemon_process_options => {
      user        => $app_user,
      group       => $app_group,
      python-path => "${django_root}:${virtualenv}/lib/python2.7/site-packages",
    },
    wsgi_process_group          => 'refinery',
    access_log_file             => 'refinery_access.log',
    access_log_format           => $log_format,
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
  }
}
