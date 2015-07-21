angular
  .module('refineryDashboard')
  .config([
    'refineryStateProvider',
    'refineryUrlRouterProvider',
    function(refineryStateProvider, refineryUrlRouterProvider) {
      refineryStateProvider
        .state(
          'launchPad',
          {
            url: '/',
            templateUrl: '/static/partials/dashboard/views/launchPad.html',
            controller: 'LaunchPadCtrl as launchPad'
          },
          '/'
        )
        .state(
          'dataSetsExploration',
          {
            url: '/explore',
            templateUrl: '/static/partials/dashboard/views/dataSetsExploration.html',
            controller: 'DataSetsExplorationCtrl as dse'
          },
          '/'
        );

      refineryUrlRouterProvider
        .otherwise(
          '/',
          '/'
        );
    }
  ]
);
