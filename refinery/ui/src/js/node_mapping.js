var DATA_SET_UI_MODE_BROWSE = 'browse';
var DATA_SET_UI_MODE_ANALYZE = 'analyze';
var DATA_SET_UI_MODE_VISUALIZE = 'visualize';

var currentDataSetUiMode = DATA_SET_UI_MODE_BROWSE;

angular.module('refineryApp', [
  'ui.select2',
  'ngResource',
  'ngRoute',
//  'refineryControllers',
])

.controller('DataSetUiModeCtrl', function($scope, $location, $rootScope, $route) {
  
  $scope.currentDataSetUiMode = currentDataSetUiMode;

  
  $scope.$watch("currentDataSetUiMode", function(mode){
    
    currentDataSetUiMode = mode;
    console.log( $route );


    console.log("currentDataSetUiMode:", currentDataSetUiMode + "  mode: " + mode );
    
    if($scope.currentDataSetUiMode === DATA_SET_UI_MODE_BROWSE){
      $location.path( 'browse');
    }

    if($scope.currentDataSetUiMode === DATA_SET_UI_MODE_ANALYZE){
      $location.path( 'analyze');
    }

    if($scope.currentDataSetUiMode === DATA_SET_UI_MODE_VISUALIZE){
      $location.path( 'visualize');
    }

  });

  $scope.updateCurrentDataSetUiMode = function() {
    $scope.currentDataSetUiMode = $scope.newDataSetUiMode;

    console.log("currentDataSetUiMode:", currentDataSetUiMode );    
  }
  
  //listen for resolve in routeProvider failing (triggers error callback)
  $rootScope.$on('$routeChangeError', function(e) {
    //$location.path('access-denied');
    console.log( "Hello! Route Change Failed!");
  });
  
  $rootScope.$on('$routeChangeSuccess', function(e) {
    $scope.current_partial = $route.current.templateUrl;
    console.log( "Hello! Route Change Success!");
  });
})

.config(['$routeProvider', function($routeProvider, $route){
    /*
      resolves = {
        checkRights : ['$q', '$http', '$route', function ($q, $http, $route) {
          var varPartial = $route.current.$route.templateUrl;          
            var defer = $q.defer();
            if (varPartial === '/static/views/data_set_ui_mode_analyze.html' && currentDataSetUiMode === DATA_SET_UI_MODE_ANALYZE) {
                console.log('resolved using:  mode =', currentDataSetUiMode, '> varPartial =', varPartial);
                defer.resolve({});
            }
            else if (varPartial === '/static/views/data_set_ui_mode_visualize.html' && currentDataSetUiMode === DATA_SET_UI_MODE_VISUALIZE ) {
                console.log('resolved using:  mode =', currentDataSetUiMode, '> varPartial =', varPartial);
                defer.resolve({});
            }
            else {
                console.log('rejected using:  mode =', currentDataSetUiMode, '> varPartial =', varPartial);
                defer.reject({});
            }
            return defer.promise;
        }]
      };
  */
    
  $routeProvider.when('/analyze', {
    templateUrl: '/static/views/data_set_ui_mode_analyze.html',
    controller: AnalyzeCtrl,
    reloadOnSearch: false,
  });

  $routeProvider.when('/visualize', {
    templateUrl: '/static/views/data_set_ui_mode_visualize.html',
    controller: VisualizeCtrl,    
    reloadOnSearch: false,
  });

  $routeProvider.when('/browse', {
    templateUrl: '/static/views/data_set_ui_mode_browse.html',
    controller: BrowseCtrl,    
    reloadOnSearch: false,
  });

}])

.config(['$locationProvider', function($locationProvider){
  //$locationProvider.html5Mode(true);
}]);


function AnalyzeCtrl($scope, $rootScope, $routeParams) {
    console.log( "AnalyzeCtrl");
    $rootScope.showCtrlTab = true;
    $rootScope.mainTabSpanSize = "span10";
}

  function VisualizeCtrl($scope, $rootScope, $routeParams) {
    console.log( "VisualizeCtrl");
    $rootScope.showCtrlTab = true;
    $rootScope.mainTabSpanSize = "span10";
  }

  function BrowseCtrl($scope, $rootScope, $routeParams) {
    console.log( "BrowseCtrl");
    $rootScope.showCtrlTab = false;
    $rootScope.mainTabSpanSize = "span12";
  }  


