class refinery::neo4j {

  class neo4jFetch {
    $neo4j_runtime_settings = '/etc/neo4j/neo4j-server.properties'
    $neo4j_launch_settings = '/etc/neo4j/neo4j-wrapper.conf'

    apt::source { 'neo4j':
      ensure   => 'present',
      comment  => 'Neo Technology Neo4j repo',
      location => 'http://debian.neo4j.org/repo',
      release  => 'stable/',
      repos    => '',
      key      => {
        'id'     => '1EEFB8767D4924B86EAD08A459D700E4D37F5F19',
        'source' => 'https://debian.neo4j.org/neotechnology.gpg.key',
      },
    }
    ->
    package { 'neo4j':
      ensure  => '2.3.1',
      # https://forge.puppet.com/puppetlabs/apt/readme#adding-new-sources-or-ppas
      require => Class['apt::update'],
    }
    ->
    limits::fragment {
      "${app_user}/soft/nofile":
        value => "40000";
      "${app_user}/hard/nofile":
        value => "40000";
    }
    ->
    file_line {
      'neo4j_no_authentication':
        path  => $neo4j_runtime_settings,
        line  => 'dbms.security.auth_enabled=false',
        match => 'dbms.security.auth_enabled=';
      'neo4j_all_ips':
        path  => $neo4j_runtime_settings,
        line  => 'org.neo4j.server.webserver.address=0.0.0.0',
        match => 'org.neo4j.server.webserver.address=';
      'neo4j_increase_transaction_timeout':
        path => $neo4j_runtime_settings,
        line => 'org.neo4j.server.transaction.timeout=600';
      'neo4j_reduce_max_memory':
        path    => $neo4j_launch_settings,
        line    => 'wrapper.java.maxmemory=32',
        match   => 'wrapper.java.maxmemory',
        replace => $::deployment_platform ? {
          'aws'   => false,
          default => true,
        };
    }
    ~>
    service { 'neo4j-service':
      ensure     => running,
      hasrestart => true,
    }
  }
  include neo4jFetch

  class neo4jOntology {
    $neo4j_config = '/etc/neo4j/neo4j-server.properties'
    $version = "0.5.0"
    $url = "https://github.com/refinery-platform/neo4j-ontology/releases/download/v${version}/ontology.jar"

    # Need to remove the old file manually as wget throws a weird
    # `HTTP request sent, awaiting response... 403 Forbidden` error when the file
    # already exists.

    exec { "neo4j-ontology-plugin-download":
      command => "rm -f /var/lib/neo4j/plugins/ontology.jar && wget -P /var/lib/neo4j/plugins/ ${url}",
      creates => "/var/lib/neo4j/plugins/ontology.jar",
      path    => "/usr/bin:/bin",
      timeout => 120,  # downloading can take some time
      notify  => Service['neo4j-service'],
    }
    ->
    file_line {
      'org.neo4j.server.thirdparty_jaxrs_classes':
        path    => $neo4j_config,
        line    => 'org.neo4j.server.thirdparty_jaxrs_classes=org.neo4j.ontology.server.unmanaged=/ontology/unmanaged',
        notify  => Service['neo4j-service'],
        require => Package['neo4j'],
    }
  }
  include neo4jOntology

  class owl2neo4j {
    $owl2neo4j_version = "0.6.1"
    $owl2neo4j_url = "https://github.com/flekschas/owl2neo4j/releases/download/v${owl2neo4j_version}/owl2neo4j.jar"

    # Need to remove the old file manually as wget throws a weird
    # `HTTP request sent, awaiting response... 403 Forbidden` error when the file
    # already exists.

    exec { "owl2neo4j_wget":
      command => "rm -f /opt/owl2neo4j.jar && wget -P /opt/ ${owl2neo4j_url}",
      creates => "/opt/owl2neo4j",
      path    => "/usr/bin:/bin",
      timeout => 120,  # downloading can take some time
    }
  }
  include owl2neo4j

  class neo4jPrePopulatedDB {
    $neo4j_user = "neo4j"
    $neo4j_group = "nogroup"
    $dirname = "graph.db"
    $filename = "${dirname}.zip"
    $install_path = "/var/lib/neo4j/data/"

    package{"unzip":
      ensure => 'installed',
    }

    exec { "stop neo4j service":
      command => "sudo service neo4j-service stop",
      user    => $app_user,
      group   => $app_group,
      path    => ['/usr/bin/'],
      require => Service["neo4j-service"],
    }
    ->
    exec { "remove old db":
      command => "sudo rm -rf graph.db",
      cwd     => "/var/lib/neo4j/data/",
      user    => $app_user,
      group   => $app_group,
      path    => ['/usr/bin/'],
    }
    ->
    archive { "fetch pre-generated db":
      path         => "/tmp/${filename}",
      source       => "http://data.cloud.refinery-platform.org.s3.amazonaws.com/data/stem-cell-commons/neo4j/2015/${filename}",
      extract      => true,
      extract_path => "${install_path}",
      creates      => "${install_path}/${dirname}",
      cleanup      => true,
      user         => 'root',
      group        => 'root',
      require      => [
        Package['unzip'],
        Class['neo4jFetch'],
      ],
    }
    ->
    exec { 'neo4j permissions':
      command => "sudo chown -R $neo4j_user:$neo4j_group $install_path/$dirname",
      path    => ['/usr/bin/'],
    }
    ->
    exec { "start neo4j service":
      command => "sudo service neo4j-service start",
      user    => $app_user,
      group   => $app_group,
      path    => ['/usr/bin/'],
      require => Service["neo4j-service"],
    }
    ->
    exec { "install neo4j annotations":
      command     => "${virtualenv}/bin/python manage.py import_annotations -c",
      environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
      cwd         => $django_root,
      user        => $app_user,
      group       => $app_group,
      require     => Exec['migrate'],
    }
  }
  include neo4jPrePopulatedDB
}
