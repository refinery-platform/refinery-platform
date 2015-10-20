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
            url: '/?q',
            reloadOnSearch: false,
            templateUrl: '/static/partials/dashboard/views/launch-pad.html',
            controller: 'LaunchPadCtrl as launchPad'
          },
          '/'
        )
        .state(
          'dataSetsExploration',
          {
            url: '/explore/',
            reloadOnSearch: false,
            templateUrl: '/static/partials/dashboard/views/data-sets-exploration.html',
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
