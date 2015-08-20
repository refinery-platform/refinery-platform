angular
  .module('refineryDataSetNav')
  .config([
    '$stateProvider', '$urlRouterProvider',
    function ($stateProvider, $urlRouterProvider) {

      // Default state
      $urlRouterProvider.otherwise(function($injector) {
        var $state = $injector.get('$state');
        $state.go('files');
      });

      $stateProvider
        .state(
          'files',
          {
            url: '/files/',
          }
      )
        .state(
          'analyses',
          {
            url: '/analyses/',
            templateUrl: '/static/partials/analyses/partials/analyses-list.html',
          }
      )
      .state(
          'attributes',
          {
            url: '/attributes/',
            }
      )
      .state(
          'downloads',
          {
            url: '/downloads/',
            }
      )
      .state(
          'details',
          {
            url: '/details/',
            }
      )
      .state(
          'sharing',
          {
            url: '/sharing/',
            }
      );
    }
  ]
);
