class refinery::neo4j {

  class neo4jFetch {
    $neo4j_config_file = '/etc/neo4j/neo4j-server.properties'

    apt::source { 'neo4j':
      ensure      => 'present',
      comment     => 'Neo Technology Neo4j repo',
      location    => 'http://debian.neo4j.org/repo',
      release     => 'stable/',
      repos       => '',
      key         => {
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
        path  => $neo4j_config_file,
        line  => 'dbms.security.auth_enabled=false',
        match => 'dbms.security.auth_enabled=';
      'neo4j_all_ips':
        path  => $neo4j_config_file,
        line  => 'org.neo4j.server.webserver.address=0.0.0.0',
        match => 'org.neo4j.server.webserver.address=';
      'neo4j_increase_transaction_timeout':
        path  => $neo4j_config_file,
        line  => 'org.neo4j.server.transaction.timeout=600';
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
      notify => Service['neo4j-service'],
    }
    ->
    file_line {
      'org.neo4j.server.thirdparty_jaxrs_classes':
        path  => $neo4j_config,
        line  => 'org.neo4j.server.thirdparty_jaxrs_classes=org.neo4j.ontology.server.unmanaged=/ontology/unmanaged',
        notify => Service['neo4j-service'],
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
    package { 'unzip':
      name        => 'unzip',
      ensure      => latest,
      require     => Class['apt::update'],
    }
    ->
    exec { "stop neo4j service":
      command     => "sudo service neo4j-service stop",
      user        => $app_user,
      group       => $app_group,
      path        => ['/usr/bin/'],
      require     => Service["neo4j-service"],
    }
    ->
    exec { "remove old db":
      command     => "sudo rm -rf graph.db",
      cwd         => "/var/lib/neo4j/data/",
      user        => $app_user,
      group       => $app_group,
      path        => ['/usr/bin/'],
    }
    ->
    exec { "fetch pre-generated db":
      command     => "sudo wget -q http://data.cloud.refinery-platform.org.s3.amazonaws.com/data/stem-cell-commons/neo4j/2015/graph.db.zip && yes | sudo unzip graph.db.zip",
      cwd         => "/var/lib/neo4j/data/",
      user        => $app_user,
      group       => $app_group,
      path        => ['/usr/bin/'],
      timeout     => 1800,
      require     => [
        Package['unzip'],
        Class['neo4jFetch'],
      ],
    }
    ->
    exec { "change db ownership":
      command     => "sudo chown -R neo4j:nogroup /var/lib/neo4j/data/graph.db",
      path        => ['/usr/bin/', '/bin/'],
    }
    ->
    exec { "start neo4j service":
      command     => "sudo service neo4j-service start",
      user        => $app_user,
      group       => $app_group,
      path        => ['/usr/bin/'],
      require     => Service["neo4j-service"],
    }
    ->
    exec { "fetch neo4j fixture":
      command     => "sudo wget -q https://raw.githubusercontent.com/refinery-platform/ontology-imports/master/django-fixure-stemcellcommons.json",
      cwd         => $django_root,
      creates     => "$django_root/django-fixure-stemcellcommons.json",
      path        => ['/usr/bin/'],
      user        => $app_user,
      group       => $app_group,
      timeout     => 1800,
    }
    ->
    exec { "install neo4j fixture":
      command     => "${virtualenv}/bin/python manage.py loaddata django-fixure-stemcellcommons.json",
      environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
      cwd         => $django_root,
      user        => $app_user,
      group       => $app_group,
      # Exit code 1 will occur the second time this command is run. This
      # will turn into a DataMigration soon but I'm avoiding creating more
      # Migrations in Django 1.6 and will address this once Django 1.7 is
      # Merged
      returns     => [0,1],
      require     => [
        Python::Requirements[$requirements],
        Postgresql::Server::Db["refinery"]
      ],
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
    ->
    exec { "remove neo4j fixture":
      command     => "rm -rf django-fixure-stemcellcommons.json",
      cwd         => $django_root,
      user        => $app_user,
      group       => $app_group,
      path        => ['/bin/'],
    }
  }
  include neo4jPrePopulatedDB
}
