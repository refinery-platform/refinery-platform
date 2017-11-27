class refinery::solr {
  class solr {
    $solr_version = '5.3.1'
    $solr_archive = "solr-${solr_version}.tgz"
    $download_path = "/tmp/${solr_archive}"
    $solr_url = "http://archive.apache.org/dist/lucene/solr/${solr_version}/${solr_archive}"

    package { 'java':
      name => 'openjdk-7-jdk',
    }

    archive { 'solr_download':
      path   => "/tmp/${solr_archive}",
      source => "${solr_url}",
    }
    ->
    exec { 'solr_extract_installer':
      command => "tar -xzf ${download_path} solr-${solr_version}/bin/install_solr_service.sh --strip-components=2",
      cwd     => '/usr/local/src',
      creates => '/usr/local/src/install_solr_service.sh',
      path    => '/bin',
    }
    ->
    file { "${::django_root}/solr/core/conf/solrconfig.xml":
      ensure  => file,
      content => template("${::django_root}/solr/core/conf/solrconfig.xml.erb"),
    }
    ->
    file { "${::django_root}/solr/data_set_manager/conf/solrconfig.xml":
      ensure  => file,
      content => template("${::django_root}/solr/data_set_manager/conf/solrconfig.xml.erb"),
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
        line  => "SOLR_HOME=${::django_root}/solr",
        match => "^SOLR_HOME";
      'solr_config_heap':
        path    => '/var/solr/solr.in.sh',
        line    => 'SOLR_HEAP="32m"',
        match   => 'SOLR_HEAP=',
        replace => $::deployment_platform ? {
          'aws'   => false,
          default => true,
        };
    }
    ->
    file_line { 'solr_config_log':
      path  => '/var/solr/log4j.properties',
      line  => "solr.log=${::django_root}/log",
      match => '^solr.log',
    }
    ~>
    service { 'solr':
      ensure     => running,
      hasrestart => true,
    }
  }
  include solr

  class solrSynonymAnalyzer {
    $version = '2.0.0'
    $url = "https://github.com/refinery-platform/solr-synonyms-analyzer/releases/download/v${version}/hon-lucene-synonyms.jar"

    # Need to remove the old file manually as wget throws a weird
    # `HTTP request sent, awaiting response... 403 Forbidden` error when the file
    # already exists.

    exec { 'solr-synonym-analyzer-download':
      command => "rm -f ${solr_lib_dir}/hon-lucene-synonyms.jar && wget -P ${solr_lib_dir} ${url}",
      creates => "${solr_lib_dir}/hon-lucene-synonyms.jar",
      path    => '/usr/bin:/bin',
      timeout => 120,  # downloading can take some time
      notify  => Service['solr'],
      require => Exec['solr_install'],
    }
  }
  include solrSynonymAnalyzer
}
