class refinery::pg {
class { 'postgresql::globals':
  version  => '9.3',
  encoding => 'UTF8',
  locale   => 'en_US.utf8',
}

class { 'postgresql::server':
}

class { 'postgresql::lib::devel':
}

postgresql::server::role { $app_user:
  createdb => true,
}
->
postgresql::server::db { 'refinery':
  user     => $app_user,
  password => '',
  owner    => $app_user,
}
}
