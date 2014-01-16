var DATA_SET_UI_MODE_BROWSE = 'browse';
var DATA_SET_UI_MODE_ANALYZE = 'analyze';
var DATA_SET_UI_MODE_VISUALIZE = 'visualize';

var currentDataSetUiMode = DATA_SET_UI_MODE_BROWSE;

angular.module('refineryApp', [
  'ui.select2',
  'ui.bootstrap',
  'ui.router',
  'ngResource',
  /*'ngRoute',*/
  'refineryControllers',
  'refineryServices',
])

.controller('DataSetUiModeCtrl', function($scope, $location, $rootScope) {
  $rootScope.mode = 'visualize';
})

.config(['$stateProvider', function($stateProvider, $rootScope, $scope) {
  //
  // For any unmatched url, redirect to /state1
  //$urlRouterProvider.otherwise("/browse");
  //
  // Now set up the states

  $stateProvider
    .state('browse', {
      templateUrl: '/static/partials/data_set_ui_mode_browse.html',
      //url: '/browse',
      controller: function($scope,$rootScope) {
        $rootScope.mode = "browse";
        $rootScope.showCtrlTab = false;
        $rootScope.mainTabSpanSize = "span12";
        $rootScope.ctrlTabSpanSize = "";
      }
    });

  $stateProvider
    .state('analyze', {
      templateUrl: "/static/partials/data_set_ui_mode_analyze.html",
      //url: '/analyze',      
      controller: function($scope,$rootScope) {
        $rootScope.mode = "analyze";
        $rootScope.showCtrlTab = true;
        $rootScope.mainTabSpanSize = "span10";
        $rootScope.ctrlTabSpanSize = "span2";
      }
    });

  $stateProvider
    .state('analyze-mapping', {
      templateUrl: "/static/partials/data_set_ui_mode_analyze.html",
      //url: '/analyze',      
      controller: function($scope,$rootScope) {
        $rootScope.mode = "analyze";
        $rootScope.showCtrlTab = true;
        $rootScope.mainTabSpanSize = "span10";
        $rootScope.ctrlTabSpanSize = "span2";
      }
    });

  $stateProvider
    .state('visualize', {
      templateUrl: "/static/partials/data_set_ui_mode_visualize.html",
      //url: '/visualize',
      controller: function($scope,$rootScope) {
        $rootScope.mode = "visualize";
        $rootScope.showCtrlTab = true;
        $rootScope.mainTabSpanSize = "span10";
        $rootScope.ctrlTabSpanSize = "span2";        
      }
    });

}])

.run(['$state', function ($state,$scope) {
   $state.transitionTo('browse');
}])

.config(['$locationProvider', function($locationProvider){
  //$locationProvider.html5Mode(true);
}]);

