class refinery::solr (
  $deployment_platform        = $refinery::params::deployment_platform,
  $app_user                   = $refinery::params::app_user,
  $app_group                  = $refinery::params::app_group,
  $data_dir                   = $refinery::params::data_dir,
  $django_root                = $refinery::params::django_root,
) inherits refinery::params {
  $solr_version = '5.3.1'
  $solr_archive = "solr-${solr_version}.tgz"
  $download_path = "/tmp/${solr_archive}"
  $solr_url = "http://archive.apache.org/dist/lucene/solr/${solr_version}/${solr_archive}"
  $solr_data_dir = "${data_dir}/solr"
  $solr_core_data = "${solr_data_dir}/core"
  $solr_data_set_manager_data = "${solr_data_dir}/data_set_manager"

  package { 'java':
    name => 'openjdk-8-jdk',
  }

  file { '/opt':
    ensure => directory,
  }

  file { [ $solr_data_dir, $solr_core_data, $solr_data_set_manager_data ]:
    ensure  => directory,
    owner   => $app_user,
    group   => $app_group,
    mode    => '0755',
    before  => Exec['solr_install'],
    require => $deployment_platform ? {
      'aws'   => Mount[$data_dir],
      default => File[$data_dir],
    },
  }

  archive { 'solr_download':
    path   => $download_path,
    source => $solr_url,
  }
  ->
  exec { 'solr_extract_installer':
    command => "tar -xzf ${download_path} solr-${solr_version}/bin/install_solr_service.sh --strip-components=2",
    cwd     => '/usr/local/src',
    creates => '/usr/local/src/install_solr_service.sh',
    path    => '/bin',
  }
  ->
  file { "${django_root}/solr/core/conf/solrconfig.xml":
    ensure  => file,
    content => template("${django_root}/solr/core/conf/solrconfig.xml.erb"),
    owner   => $app_user,
    group   => $app_group,
  }
  ->
  file { "${django_root}/solr/data_set_manager/conf/solrconfig.xml":
    ensure  => file,
    content => template("${django_root}/solr/data_set_manager/conf/solrconfig.xml.erb"),
    owner   => $app_user,
    group   => $app_group,
  }
  ->
  exec { 'solr_install': # also starts the service
    command => "sudo bash ./install_solr_service.sh /tmp/${solr_archive} -u ${app_user}",
    cwd     => '/usr/local/src',
    creates => "/opt/solr-${solr_version}",
    path    => '/usr/bin:/bin',
    require => [ File['/opt'], Package['java'] ],
  }
  ->
  file_line {
    'solr_config_home':
      path  => '/var/solr/solr.in.sh',
      line  => "SOLR_HOME=${django_root}/solr",
      match => "^SOLR_HOME";
    'solr_config_heap':
      path    => '/var/solr/solr.in.sh',
      line    => 'SOLR_HEAP="32m"',
      match   => 'SOLR_HEAP=',
      replace => $deployment_platform ? {
        'aws'   => false,
        default => true,
      };
  }
  ->
  file_line { 'solr_config_log':
    path  => '/var/solr/log4j.properties',
    line  => "solr.log=${django_root}/log",
    match => '^solr.log',
  }
  ~>
  service { 'solr':
    ensure     => running,
    hasrestart => true,
  }
}
