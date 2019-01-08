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
            templateUrl: function () {
              // unit tests redefine $window and thus make it unusable here
              return window.getStaticUrl(
                'partials/dashboard/views/launch-pad.html'
              );
            }
          },
          '/explore',
          true
        )
        .state(
          'launchPad.exploration', {
            // `branchId` is an artifact of the treemap as some terms appear
            // multiple times. Instead of storing the whole path back to the
            // root, we store the branch ID to specify which path the user took.
            url: 'exploration?context&branchId&visibleDepth',
            reloadOnSearch: false
          },
          '/explore',
          true
        )
        .state(
          'launchPad.preview', {
            url: '/preview/{uuid}'
          },
          '/explore',
          true
        );

      refineryUrlRouterProvider.otherwise('/', '/explore');
    }
  ]
);

