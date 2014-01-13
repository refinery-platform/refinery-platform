var DATA_SET_UI_MODE_BROWSE = 'browse';
var DATA_SET_UI_MODE_ANALYZE = 'analyze';
var DATA_SET_UI_MODE_VISUALIZE = 'visualize';

var currentDataSetUiMode = DATA_SET_UI_MODE_BROWSE;

angular.module('refineryApp', [
  'ui.select2',
  'ngResource',
  'ngRoute',
  'refineryControllers',
  'refineryServices',
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

    if ( $scope.currentDataSetUiMode === DATA_SET_UI_MODE_VISUALIZE ||
         $scope.currentDataSetUiMode === DATA_SET_UI_MODE_ANALYZE ) {
      $rootScope.showCtrlTab = true;
      $rootScope.mainTabSpanSize = "span10";
    }
    else {
      $rootScope.showCtrlTab = false;
      $rootScope.mainTabSpanSize = "span12";
    }
  };
  
  //listen for resolve in routeProvider failing (triggers error callback)
  $rootScope.$on('$routeChangeError', function(e) {
    console.log( "Route Change Failed!");
  });
  
  $rootScope.$on('$routeChangeSuccess', function(e) {
    if ( $route.current ) {
      $scope.current_partial = $route.current.templateUrl;
    }
    else {
     $scope.current_partial = undefined; 
    }
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
    templateUrl: '/static/partials/data_set_ui_mode_analyze.html',
    //templateUrl: '/static/partials/workflows.html',
    controller: 'WorkflowListApiCtrl',
    reloadOnSearch: false,
  });

  $routeProvider.when('/visualize', {
    templateUrl: '/static/partials/data_set_ui_mode_visualize.html',
    controller: VisualizeCtrl,    
    reloadOnSearch: false,
  });

  $routeProvider.when('/browse', {
    templateUrl: '/static/partials/data_set_ui_mode_browse.html',
    controller: BrowseCtrl,    
    reloadOnSearch: false,
  });

}])

.config(['$locationProvider', function($locationProvider){
  //$locationProvider.html5Mode(true);
}]);

  function VisualizeCtrl($scope, $rootScope, $routeParams) {
    console.log( "VisualizeCtrl");
  }

  function BrowseCtrl($scope, $rootScope, $routeParams) {
    console.log( "BrowseCtrl");
  }  


