var DATA_SET_UI_MODE_BROWSE = 'browse';
var DATA_SET_UI_MODE_ANALYZE = 'analyze';
var DATA_SET_UI_MODE_VISUALIZE = 'visualize';

var currentDataSetUiMode = DATA_SET_UI_MODE_BROWSE;

// Angular monkey patch to address removal of trailing slashes by $resource: https://github.com/angular/angular.js/issues/992
angular.module('ngResource').config(['$provide', '$httpProvider',
    function($provide, $httpProvider) {

        $provide.decorator('$resource', function($delegate) {
            return function() {
                'use strict';
                if (arguments.length > 0) {  // URL
                    arguments[0] = arguments[0].replace(/\/$/, '\\/');
                }

                if (arguments.length > 2) {  // Actions
                    angular.forEach(arguments[2], function(action) {
                        if (action && action.url) {
                            action.url = action.url.replace(/\/$/, '\\/');
                        }
                    });
                }

                return $delegate.apply($delegate, arguments);
            };
        });

        $provide.factory('resourceEnforceSlashInterceptor', function() {
            return {
                request: function(config) {
                    config.url = config.url.replace(/[\/\\]+$/, '/');
                    return config;
                }
            };
        });

        $httpProvider.interceptors.push('resourceEnforceSlashInterceptor');
    }
]);

angular.module('refineryApp', [
  'ui.select2',
  'ui.bootstrap',
  'ui.router',
  'ngResource',
  'refineryControllers',
  'refineryServices',
])


.config(['$httpProvider', function($httpProvider) {
  // use Django XSRF/CSRF lingo to enable communication with API
  $httpProvider.defaults.xsrfCookieName = 'csrftoken';
  $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';      

}])


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

// http://jsfiddle.net/jgoemat/CPRda/1/
.directive('nodeDraggable', function () {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      element[0].addEventListener('dragstart', scope.handleNodeDragStart, false);
      element[0].addEventListener('dragend', scope.handleNodeDragEnd, false);
    }
  };
})

.directive('nodeDroppable', function () {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      element[0].addEventListener('drop', scope.handleNodeDrop, false);
      element[0].addEventListener('dragover', scope.handleNodeDragOver, false);
      element[0].addEventListener('dragenter', scope.handleNodeDragEnter, false);
      element[0].addEventListener('dragleave', scope.handleNodeDragLeave, false);
    }
  };
})

.controller('FileMappingCtrl', function($scope, $location, $rootScope, $sce, NodePair) {

  $scope.nodeDropzones = {
    "0": {
      "name": "",
      "color": "purple",
      "preview": null,
      "uuid": null
    },
    "1": {
      "name": "",
      "color": "green",
      "preview": null,
      "uuid": null
    }
  };

  $scope.nodePairSaved = false;

  $scope.$onRootScope('workflowChangedEvent', function( event, currentWorkflow ) {
    $scope.currentWorkflow = currentWorkflow;
  });  

  $scope.updateNodeDropzone = function(dropzoneIndex, uuid, preview ) {
      $scope.nodeDropzones[dropzoneIndex].uuid = uuid;
      $scope.nodeDropzones[dropzoneIndex].preview = $sce.trustAsHtml( preview );
  };

  $scope.handleNodeDragStart = function(event){
      this.style.opacity = '0.4';

      var uuid = event.srcElement.attributes['node-uuid'].value;
      event.dataTransfer.setData('text/plain', JSON.stringify( { uuid: uuid, html: this.innerHTML } ) );
  };  

  $scope.handleNodeDragEnd = function(e){
      this.style.opacity = '1.0';
  };

  $scope.handleNodeDrop = function(e){
      e.preventDefault();
      e.stopPropagation();

      // reset styles
      this.style.opacity = 1.0;

      // grab dropped data (coming in a string)
      var dataString = e.dataTransfer.getData('text/plain');
      var data = null;

      // get dropzone index
      var dropzoneIndex = null;
      try {        
        dropzoneIndex = e.srcElement.attributes['node-dropzone-index'].value;
      }
      catch( exception ) {
        console.error( "No dropzone index." );
      }

      // parse incoming data into object
      try {
        data = JSON.parse( dataString );
      } 
      catch ( exception ) {
        console.error( "Parsing error: " + exception );
      }

      // update dropzone
      $scope.updateNodeDropzone( dropzoneIndex, data.uuid, data.html );
      $scope.nodePairSaved = false;

      // save node pair?
      if ( $scope.nodeDropzones[0].uuid && $scope.nodeDropzones[1].uuid ) {
        var nodePair = new NodePair( { node1: "/api/v1/node/" + $scope.nodeDropzones[0].uuid + "/", node2: "/api/v1/node/" + $scope.nodeDropzones[1].uuid + "/" } );
        $scope.$apply();

        nodePair.$save(function(u, responseHeaders) {
          $scope.nodePairSaved = true;
          //u => saved user object
          //responseHeaders => $http header getter
        });
      }

      $scope.$apply();
  };
  
  $scope.handleNodeDragEnter = function (e) {
      e.preventDefault(); // Necessary. Allows us to drop.
      e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.

      this.style.opacity = 0.5;

      return false;
  };

  $scope.handleNodeDragLeave = function (e) {
      e.preventDefault(); // Necessary. Allows us to drop.
      e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.

      this.style.opacity = 1.0;

      return false;
  };

  $scope.handleNodeDragOver = function (e) {
      e.preventDefault(); // Necessary. Allows us to drop.
      e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.

      return false;
  };  
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

.factory("NodePair", function($resource, $http) {
  'use strict';

  return $resource(
    "/api/v1/nodepair/", {
      format: "json",
    }
  );
})


.run(['$state', function ($state,$scope) {
   $state.transitionTo('browse');
}]);