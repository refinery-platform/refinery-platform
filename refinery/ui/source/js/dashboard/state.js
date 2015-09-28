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
            templateUrl: '/static/partials/dashboard/views/launch-pad.html',
            controller: 'LaunchPadCtrl as launchPad'
          },
          '/'
        )
        .state(
          'launchPad.exploration',
          {
            url: 'exploration',
          },
          '/'
        )
        .state(
          'launchPad.preview',
          {
            url: 'preview/{uuid}',
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
