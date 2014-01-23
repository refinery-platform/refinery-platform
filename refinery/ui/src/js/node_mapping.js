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

.config(['$provide', function($provide) {
    // http://stackoverflow.com/questions/11252780/whats-the-correct-way-to-communicate-between-controllers-in-angularjs
    $provide.decorator('$rootScope', ['$delegate', function($delegate){

        Object.defineProperty($delegate.constructor.prototype, '$onRootScope', {
            value: function(name, listener){
                var unsubscribe = $delegate.$on(name, listener);
                this.$on('$destroy', unsubscribe);
            },
            enumerable: false
        });


        return $delegate;
    }]);
}])


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

.controller('FileMappingCtrl', function($scope, $location, $rootScope) {
  $scope.$onRootScope('workflowChangedEvent', function( event, currentWorkflow ) {
    $scope.currentWorkflow = currentWorkflow;
    console.log( "File Mapping Controller: New workflow: " + $scope.currentWorkflow.name );
  });  
})

.controller('NodeSetListApiCtrl', function($scope, NodeSetList) {
  'use strict';

  var NodeSets = NodeSetList.get(
    {study__uuid: externalStudyUuid, assay__uuid: externalAssayUuid},
    function() {
      $scope.nodesetList = NodeSets.objects;
  });

  $scope.updateCurrentNodeSet = function() {
    $scope.currentNodeSet = $scope.nodesetList[$scope.nodesetIndex];  
  };
})

.controller('NodeMappingListApiCtrl', function($scope, NodeMappingList) {
  'use strict';

  var NodeMappings = NodeMappingList.get(
    {study__uuid: externalStudyUuid, assay__uuid: externalAssayUuid},
    function() {
      $scope.nodemappingList = NodeMappings.objects;
  });

  $scope.updateCurrentNodeMapping = function() {
    $scope.currentNodeMapping = $scope.nodemappingList[$scope.nodemappingIndex];  

    
  };  
})

.controller('DataSetUiModeCtrl', function($scope, $location, $rootScope) {
  $rootScope.mode = DATA_SET_UI_MODE_BROWSE;

  $scope.$onRootScope('workflowChangedEvent', function( event, currentWorkflow ) {
    $scope.currentWorkflow = currentWorkflow;
    console.log( "Data Set UI Mode Controller: New workflow: " + $scope.currentWorkflow.name );
  });  
})

.factory("NodeSetList", function($resource) {
  'use strict';

  return $resource(
    "/api/v1/nodesetlist/", {format: "json"}
  );
})

.factory("NodeMappingList", function($resource) {
  'use strict';

  return $resource(
    "/api/v1/noderelationship/", {format: "json"}
  );
})

.run(['$state', function ($state,$scope) {
   $state.transitionTo('browse');
}]);
