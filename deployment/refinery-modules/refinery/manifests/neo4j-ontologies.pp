class refinery::neo4j-ontologies {
  package { 'unzip':
    name        => 'unzip',
    ensure      => latest,
    require     => Class['apt::update'],
  }
  service { 'neo4j-service':
    ensure => 'stopped',
  }
  exec { "remove old db":
    command     => "sudo rm -rf graph.db",
    cwd         => "/var/lib/neo4j/data/",
    user        => $app_user,
    group       => $app_group,
    path        => ['/usr/bin/'],
  }
  exec { "fetch_pre-generated db":
    command     => "wget http://data.cloud.refinery-platform.org.s3.amazonaws.com/data/stem-cell-commons/neo4j/2015/graph.db.zip && sudo unzip graph.db.zip",
    cwd         => "/var/lib/neo4j/data/",
    user        => $app_user,
    group       => $app_group,
    path        => ['/usr/bin/'],
    require     => [
      Class['neo4j'],
      Package['unzip'],
      Exec["remove old db"]
    ],
  }
  exec { "change db ownership":
    command     => "sudo chown -R neo4j:nogroup /var/lib/neo4j/data/graph.db",
    user        => $app_user,
    group       => $app_group,
    path        => ['/usr/bin/', '/bin/'],
    require     => Exec["fetch_pre-generated db"],
  }
  service { 'neo4j-service':
    ensure      => 'started',
  }
  exec { "fetch neo4j fixture":
    command     => "wget https://raw.githubusercontent.com/refinery-platform/ontology-imports/master/django-fixure-stemcellcommons.json ontologies.json",
    environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
    cwd         => $django_root,
    creates     => "$django_root/ontologies.json",
    path        => ['/usr/bin/'],
    user        => $app_user,
    group       => $app_group,
  }
  exec { "install neo4j fixture":
    command     => "${virtualenv}/bin/python manage.py loaddata ontologies.json",
    environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
    cwd         => $django_root,
    user        => $app_user,
    group       => $app_group,
    require     => [
      Exec["fetch neo4j fixture"],
      Python::Requirements[$requirements],
      Postgresql::Server::Db["refinery"]
    ],
  }
  exec { "install neo4j annotations":
    command     => "${virtualenv}/bin/python manage.py import_annotations -c",
    environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
    cwd         => $django_root,
    user        => $app_user,
    group       => $app_group,
    require     => Exec["install neo4j fixture"],
  }

}