angular
  .module('refineryDashboard')
  .config([
    'refineryStateProvider',
    function(refineryStateProvider) {
      refineryStateProvider
        .state(
          'launchPad',
          {
            url: '/',
            templateUrl: '/static/partials/dashboard/views/launchPad.html',
            controller: 'LaunchPadCtrl as launchPad'
          },
          '/');

      refineryStateProvider
        .state(
          'dataSetsExploration',
          {
            url: '/explore',
            templateUrl: '/static/partials/dashboard/views/dataSetsExploration.html',
            controller: 'DataSetsExplorationCtrl as dse'
          },
          '/');
    }
  ]
);
