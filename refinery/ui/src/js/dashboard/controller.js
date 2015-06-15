function DashboardCtrl ($cookies, $cookieStore, initData) {

}

angular
  .module('refineryDashboard')
  .controller('DashboardCtrl', [
    '$cookies',
    '$cookieStore',
    'initData',
    DashboardCtrl
  ]);
