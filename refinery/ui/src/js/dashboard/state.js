angular
  .module('refineryDashboard')
  .config([
    '$stateProvider',
    '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {
      // For any unmatched url, redirect to /state1
      $urlRouterProvider.otherwise('/');

      // Now set up the states
      $stateProvider
        .state('launchPad', {
          url: '/',
          templateUrl: '/static/partials/dashboard/views/launchPad.html',
          controller: 'LaunchPadCtrl as launchPad'
        })
        .state('dataSetsExploration', {
          url: '/explore',
          templateUrl: '/static/partials/dashboard/views/dataSetsExploration.html',
          controller: 'DataSetsExplorationCtrl as dse'
        });
    }
  ]
);
