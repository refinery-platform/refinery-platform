//angular
//  .module('refineryDataSetNav')
//  .config([
//    'refineryStateProvider', 'refineryUrlRouterProvider',
//    function (refineryStateProvider, refineryUrlRouterProvider) {
//      refineryStateProvider
//        .state(
//          'analyses',
//          {
//            url: '/testing/this/analyses',
//            templateUrl: '/static/partials/data-set-nav/partials/analyses.html',
//            controller: 'AnalysesCtrl as analysesCtrl'
//          }, '/data_sets/'
//      );
//    }
//  ]
//);

angular
  .module('refineryDataSetNav')
  .config([
    '$stateProvider', '$urlRouterProvider',
    function ($stateProvider, $urlRouterProvider) {

      $stateProvider
        .state(
          'content',
          {
            url: '/content/',
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
          'configuration',
          {
            url: '/configuration/',
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
