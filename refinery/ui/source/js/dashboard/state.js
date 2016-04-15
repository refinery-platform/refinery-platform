'use strict';

angular
  .module('refineryDashboard')
  .config([
    'refineryStateProvider',
    'refineryUrlRouterProvider',
    function (refineryStateProvider, refineryUrlRouterProvider) {
      refineryStateProvider
        .state(
          'launchPad', {
            url: '/?q',
            reloadOnSearch: false,
            templateUrl: '/static/partials/dashboard/views/launch-pad.html',
            controller: 'LaunchPadCtrl as launchPad'
          },
          '/'
        )
        .state(
          'launchPad.exploration', {
            // `branchId` is an artifact of the treemap as some terms appear
            // multiple times. Instead of storing the whole path back to the
            // root, we store the branch ID to specify which path the user took.
            url: 'exploration?context&branchId&visibleDepth',
            reloadOnSearch: false
          },
          '/'
        )
        .state(
          'launchPad.preview', {
            url: 'preview/{uuid}'
          },
          '/'
        );

      refineryUrlRouterProvider.otherwise('/', '/');
    }
  ]
);
