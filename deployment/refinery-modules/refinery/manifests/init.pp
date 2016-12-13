class refinery {

# for better performance
sysctl { 'vm.swappiness': value => '10' }

# to avoid empty ident name not allowed error when using git
user { $app_user: comment => $app_user }

file { "/home/${app_user}/.ssh/config":
  ensure => file,
  source => "${deployment_root}/ssh-config",
  owner  => $app_user,
  group  => $app_group,
}

class { 'python':
  version    => 'system',
  pip        => true,
  dev        => true,
  virtualenv => true,
  gunicorn   => false,
}

class venvdeps {
  package { 'build-essential': }
  package { 'libncurses5-dev': }
  package { 'libldap2-dev': }
  package { 'libsasl2-dev': }
  package { 'libffi-dev': }  # for SSL modules
}
include venvdeps

file { "/home/${app_user}/.virtualenvs":
  # workaround for parent directory /home/vagrant/.virtualenvs does not exist error
  ensure => directory,
  owner  => $app_user,
  group  => $app_group,
}
->
python::virtualenv { $virtualenv:
  ensure  => present,
  owner   => $app_user,
  group   => $app_group,
  require => [ Class['venvdeps'], Class['postgresql::lib::devel'] ],
}
~>
python::requirements { $requirements:
  virtualenv => $virtualenv,
  owner      => $app_user,
  group      => $app_group,
}

package { 'virtualenvwrapper': }
->
file_line { "virtualenvwrapper_config":
  path    => "/home/${app_user}/.profile",
  line    => "source /etc/bash_completion.d/virtualenvwrapper",
  require => Python::Virtualenv[$virtualenv],
}
->
file { "virtualenvwrapper_project":
  # workaround for setvirtualenvproject command not found
  ensure  => file,
  path    => "${virtualenv}/.project",
  content => "${django_root}",
  owner   => $app_user,
  group   => $app_group,
}

file { ["${project_root}/isa-tab", "${project_root}/import", "${project_root}/static"]:
  ensure => directory,
  owner  => $app_user,
  group  => $app_group,
}

file_line { "django_settings_module":
  path => "/home/${app_user}/.profile",
  line => "export DJANGO_SETTINGS_MODULE=${django_settings_module}",
}
->
file { "${django_root}/config/config.json":
  ensure  => file,
  content => template("${django_root}/config/config.json.erb"),
  owner   => $app_user,
  group   => $app_group,
  replace => false,
}
->
exec { "syncdb_initial":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py syncdb --noinput",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
  require     => [
    Python::Requirements[$requirements],
    Postgresql::Server::Db["refinery"]
  ],
}
->
exec { "migrate_registration":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py migrate registration",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
}
->
exec { "migrate_core":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py migrate core",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
}
->
exec { "set_up_refinery_site_name":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py set_up_site_name '${site_name}' '${site_url}'",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
}
->
exec { "migrate_guardian":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py migrate guardian",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
}
->
exec { "create_public_group":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py create_public_group",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
}
->
exec { "create_superuser":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py loaddata superuser.json",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
}
->
exec { "add_admin_to_public_group":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py add_admin_to_public_group",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
}
->
exec { "create_user":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py create_user 'guest' 'guest' 'guest@example.com' 'Guest' '' ''",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
}
->
exec { "syncdb_final":
  command     => "${virtualenv}/bin/python ${django_root}/manage.py syncdb --migrate --noinput",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  user        => $app_user,
  group       => $app_group,
}

file { "/opt":
  ensure => directory,
}

class solr {
  $solr_version = "5.3.1"
  $solr_archive = "solr-${solr_version}.tgz"
  $solr_url = "http://archive.apache.org/dist/lucene/solr/${solr_version}/${solr_archive}"

  package { 'java':
    name => 'openjdk-7-jdk',
  }
  exec { "solr_download":
    command => "wget ${solr_url} -O ${solr_archive}",
    cwd     => "/usr/local/src",
    creates => "/usr/local/src/${solr_archive}",
    path    => "/usr/bin",
    timeout => 600,  # downloading can take a long time
  }
  ->
  exec { "solr_extract_installer":
    command => "tar -xzf ${solr_archive} solr-${solr_version}/bin/install_solr_service.sh --strip-components=2",
    cwd     => "/usr/local/src",
    creates => "/usr/local/src/install_solr_service.sh",
    path    => "/bin",
  }
  ->
  file { "${django_root}/solr/core/conf/solrconfig.xml":
    ensure  => file,
    content => template("${django_root}/solr/core/conf/solrconfig.xml.erb"),
  }
  ->
  file { "${django_root}/solr/data_set_manager/conf/solrconfig.xml":
    ensure  => file,
    content => template("${django_root}/solr/data_set_manager/conf/solrconfig.xml.erb"),
  }
  ->
  exec { "solr_install":  # also starts the service
    command => "sudo bash ./install_solr_service.sh ${solr_archive} -u ${app_user}",
    cwd     => "/usr/local/src",
    creates => "/opt/solr-${solr_version}",
    path    => "/usr/bin:/bin",
    require => [ File["/opt"], Package['java'] ],
  }
  ->
  file_line { "solr_config_home":
    path  => "/var/solr/solr.in.sh",
    line  => "SOLR_HOME=${django_root}/solr",
    match => "^SOLR_HOME",
  }
  ->
  file_line { "solr_config_log":
    path  => "/var/solr/log4j.properties",
    line  => "solr.log=${django_root}/log",
    match => "^solr.log",
  }
  ~>
  service { 'solr':
    ensure     => running,
    hasrestart => true,
  }
}
include solr

class solrSynonymAnalyzer {
  $version = "2.0.0"
  $url = "https://github.com/refinery-platform/solr-synonyms-analyzer/releases/download/v${version}/hon-lucene-synonyms.jar"

  # Need to remove the old file manually as wget throws a weird
  # `HTTP request sent, awaiting response... 403 Forbidden` error when the file
  # already exists.

  exec { "solr-synonym-analyzer-download":
    command => "rm -f ${solr_lib_dir}/hon-lucene-synonyms.jar && wget -P ${solr_lib_dir} ${url}",
    creates => "${solr_lib_dir}/hon-lucene-synonyms.jar",
    path    => "/usr/bin:/bin",
    timeout => 120,  # downloading can take some time
    notify => Service['solr'],
    require => Exec['solr_install'],
  }
}
include solrSynonymAnalyzer



include '::rabbitmq'

class ui {
  apt::source { 'nodejs':
    ensure      => 'present',
    comment     => 'Nodesource NodeJS repo.',
    location    => 'https://deb.nodesource.com/node_6.x',
    release     => 'trusty',
    repos       => 'main',
    key         => {
      'id'     => '9FD3B784BC1C6FC31A8A0A1C1655A0AB68576280',
      'server' => 'keyserver.ubuntu.com',
    },
    include => {
      'src' => true,
      'deb' => true,
    },
  }
  ->
  package { 'nodejs':
    name    => 'nodejs',
    ensure  => latest,
    # https://forge.puppet.com/puppetlabs/apt/readme#adding-new-sources-or-ppas
    require => Class['apt::update'],
  }
  ->
  package {
    'bower': ensure => '1.7.7', provider => 'npm';
    'grunt-cli': ensure => '0.1.13', provider => 'npm';
  }
  ->
  exec { "npm_prune_local_modules":
    command   => "/usr/bin/npm prune --progress false",
    cwd       => $ui_app_root,
    logoutput => on_failure,
    user      => $app_user,
    group     => $app_group,
  }
  ->
  exec { "npm_install_local_modules":
    command   => "/usr/bin/npm install --progress false",
    cwd       => $ui_app_root,
    logoutput => on_failure,
    user      => $app_user,
    group     => $app_group,
  }
  ->
  exec { "bower_modules":
    command     => "/bin/rm -rf ${ui_app_root}/bower_components && /usr/bin/bower install --config.interactive=false",
    cwd         => $ui_app_root,
    logoutput   => on_failure,
    user        => $app_user,
    group       => $app_group,
    environment => ["HOME=/home/${app_user}"],
  }
  ->
  exec { "grunt":
    command   => "/usr/bin/grunt make",
    cwd       => $ui_app_root,
    logoutput => on_failure,
    user      => $app_user,
    group     => $app_group,
  }
  ->
  exec { "collectstatic":
    command     => "${virtualenv}/bin/python ${django_root}/manage.py collectstatic --clear --noinput",
    environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
    user        => $app_user,
    group       => $app_group,
    require     => Python::Requirements[$requirements],
  }
}
include ui

package { 'memcached': }
->
service { 'memcached':
  ensure => running,
}

file { "${django_root}/supervisord.conf":
  ensure  => file,
  content => template("${django_root}/supervisord.conf.erb"),
  owner   => $app_user,
  group   => $app_group,
}
->
exec { "supervisord":
  command     => "${virtualenv}/bin/supervisord",
  environment => ["DJANGO_SETTINGS_MODULE=${django_settings_module}"],
  cwd         => $django_root,
  creates     => "/tmp/supervisord.pid",
  user        => $app_user,
  group       => $app_group,
  require     => [
    Class["ui"],
    Class["solr"],
    Class["neo4j"],
    Class["::rabbitmq"],
    Service["memcached"],
  ],
}

package { 'libapache2-mod-wsgi': }
package { 'apache2': }
# required for the rewrite rules used in HTTP to HTTPS redirect
exec { 'apache2-rewrite':
  command   => '/usr/sbin/a2enmod rewrite',
  subscribe => [ Package['apache2'] ],
}
->
exec { 'apache2-wsgi':
  command   => '/usr/sbin/a2enmod wsgi',
  subscribe => [ Package['apache2'], Package['libapache2-mod-wsgi'] ],
}
->
file { "/etc/apache2/sites-available/001-refinery.conf":
  ensure  => file,
  content => template("${deployment_root}/apache.conf.erb"),
}
~>
exec { 'apache2-default-disable':
  command => '/usr/sbin/a2dissite 000-default',
}
~>
exec { 'apache2-refinery-enable':
  command => '/usr/sbin/a2ensite 001-refinery',
}
~>
service { 'apache2':
  ensure     => running,
  hasrestart => true,
}

}
