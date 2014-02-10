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

angular.module('refineryNodeMapping', [
  'ui.select2',
  'ui.bootstrap',
  'ui.router',
  'ngResource',
  'refineryWorkflows',
  'refinerySolr',
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

.controller('FileMappingCtrl', function($scope, $location, $rootScope, $sce, $http, NodePair, NodeRelationship, AttributeOrder, solrFactory, solrService ) {

  $scope.nodeDropzones = null;
  $scope.currentNodePair = null;
  $scope.currentNodePairIndex = 0;
  $scope.currentNodeRelationship = null;
  $scope.attributeOrderList = null;

  $scope.$onRootScope('workflowChangedEvent', function( event, currentWorkflow ) {
    $scope.currentWorkflow = currentWorkflow;

    if ( !$scope.currentWorkflow ) {
      return;
    }

    $scope.nodeDropzones["0"].name = $scope.currentWorkflow.input_relationships[0].set1;
    $scope.nodeDropzones["1"].name = $scope.currentWorkflow.input_relationships[0].set2;      
  });  

  $scope.$onRootScope('nodeRelationshipChangedEvent', function( event, currentNodeRelationship ) {
    $scope.currentNodeRelationship = currentNodeRelationship;

    if ( !$scope.currentNodeRelationship ) {
      return;
    }
    
    $scope.currentNodePairIndex = 0;
    $scope.loadMapping( $scope.currentNodePairIndex );

    $scope.nodeDropzones["0"].name = $scope.currentWorkflow.input_relationships[0].set1;
    $scope.nodeDropzones["1"].name = $scope.currentWorkflow.input_relationships[0].set2;
  });  

  $scope.initializeNodeDropzones = function() {
    $scope.nodeDropzones = {
        "0": {
          "name": "",
          "color": "purple",
          "attributes": null,
          "uuid": null
        },
        "1": {
          "name": "",
          "color": "green",
          "attributes": null,
          "uuid": null
        }
      };    
  };

  $scope.initializeNodeDropzones();

  $scope.isPending = function() {
    //return ( ( $scope.nodeDropzones[0].uuid !== null || $scope.nodeDropzones[1].uuid !== null ) && $scope.currentNodePair === null );
    return ( $scope.currentNodePair === null );
  };

  $scope.createMapping = function() {
    console.log( "Creating ... ");
    $scope.initializeNodeDropzones();
    $scope.currentNodePair = null;    
    $scope.currentNodePairIndex = $scope.currentNodeRelationship.node_pairs.length;
  };
  //$scope.createMapping();

  $scope.deleteMapping = function() {
    console.log( "Deleting ... ");

    if ( $scope.currentNodePair ) {
      // update node relationship
      $scope.currentNodeRelationship.node_pairs.splice( $scope.currentNodePairIndex, 1 );
      NodeRelationship.update( { uuid: $scope.currentNodeRelationship.uuid }, $scope.currentNodeRelationship );

      // delete node pair
      NodePair.delete( { uuid: $scope.currentNodePair.uuid } );

      $scope.currentNodePair = null;
    }
    $scope.initializeNodeDropzones();
  };

  $scope.loadMapping = function( index ) {
    if ( $scope.currentNodeRelationship.node_pairs.length > index ) {      
      $scope.currentNodePair = NodePair.load_from_uri( { uri: decodeURIComponent( $scope.currentNodeRelationship.node_pairs[index].substring(1) ) }, function ( data ) {
        console.log( data );
        $scope.updateNodeDropzone( 0, data.node1.split("/").reverse()[1] );
        $scope.updateNodeDropzone( 1, data.node2.split("/").reverse()[1] );
      }, function ( error ) {
        $scope.currentNodePair = null;        
        console.error( "Failed to load mapping." );
      } );
    } 
    else {
      $scope.initializeNodeDropzones();
      $scope.currentNodePair = null;
    }
  };

  $scope.loadNextMapping = function() {
    if ( $scope.currentNodeRelationship.node_pairs.length <= ++$scope.currentNodePairIndex ) {
      $scope.currentNodePairIndex = 0;
    }
    $scope.loadMapping( $scope.currentNodePairIndex );
  };

  $scope.loadPreviousMapping = function() {
    if ( 0 > --$scope.currentNodePairIndex ) {
      $scope.currentNodePairIndex = $scope.currentNodeRelationship.node_pairs.length - 1;
    }
    $scope.loadMapping( $scope.currentNodePairIndex );      
  };

  $scope.updateNodeDropzone = function(dropzoneIndex, uuid ) {
      $scope.nodeDropzones[dropzoneIndex].uuid = uuid;

      $scope.loadNodeAttributes( uuid, $scope.attributeOrderList, function( data ) {
        var attributes = [];
        if ( data.response.docs.length == 1 ) {
          angular.forEach( $scope.attributeOrderList, function( attribute ) {
            attributes.push( { "name": solrService.prettifyFieldName( attribute, true ), "value": data.response.docs[0][attribute] } );
          });          
        }
        else {
          attributes = null;
        }

        $scope.nodeDropzones[dropzoneIndex].attributes = attributes;
      }, function( error ) {
        $scope.nodeDropzones[dropzoneIndex].attributes = null;
      } );
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
      $scope.updateNodeDropzone( dropzoneIndex, data.uuid );

      // save node pair?
      if ( $scope.nodeDropzones[0].uuid && $scope.nodeDropzones[1].uuid ) {
        $scope.currentNodePair = new NodePair( { node1: "/api/v1/node/" + $scope.nodeDropzones[0].uuid + "/", node2: "/api/v1/node/" + $scope.nodeDropzones[1].uuid + "/" } );

        $scope.currentNodePair.$save( function( response, responseHeaders) {
          $scope.currentNodePair = response;
          $scope.currentNodeRelationship.node_pairs.push( $scope.currentNodePair.resource_uri );
          NodeRelationship.update( { uuid: $scope.currentNodeRelationship.uuid }, $scope.currentNodeRelationship );
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

  $scope.loadNodeAttributes = function( uuid, attributeList, success, error ) {
      solrFactory.get({ "nodeUuid": uuid, "attributeList": attributeList.join() }, function( data ) { success( data ); }, function( data ) { error( data ); } );
  };

  var AttributeOrderList = AttributeOrder.get(
    {study__uuid: externalStudyUuid, assay__uuid: externalAssayUuid},
    function( response ) {
      $scope.attributeOrderList = [];
      for ( var i = 0; i < response.objects.length; ++i ) {
        $scope.attributeOrderList.push( response.objects[i].solr_field );
      }
  });
})

.directive('attributeList', function() {
  return {
    template: '<ul><li ng-repeat="attribute in attributes">{{attribute.name}}: <b>{{attribute.value}}</b></li></ul>',
    restrict: 'A',
    scope: {
      attributes: '='
    },
    //templateUrl: '/static/partials/attribute_list.html',
  };
})

.directive('diffAttributeList', function() {
  return {
    //template: '<ul><li ng-repeat="attribute in diffAttributes">{{attribute.name}}: <b>{{attribute.valueSetA}}</b> vs <b>{{attribute.valueSetB}}</b></li></ul><ul><li ng-repeat="attribute in commonAttributes">{{attribute.name}}: <b>{{attribute.value}}</b></li></ul>',
    restrict: 'A',
    scope: {
      setA: '=',
      setB: '='
    },
    templateUrl: '/static/partials/diff_attribute_list.html',
    link: function (scope, elem, attrs) {        

        var updateDiff = function() {
          scope.diffAttributes = [];
          scope.commonAttributes = [];

          for ( var i = 0; i < scope.setA.attributes.length; ++i ) {
            if ( scope.setA.attributes[i].name === scope.setB.attributes[i].name ) {
              if ( scope.setA.attributes[i].value === scope.setB.attributes[i].value ) {
                scope.commonAttributes.push( { name: scope.setA.attributes[i].name, value: scope.setA.attributes[i].value });
              }
              else {
                scope.diffAttributes.push( { name: scope.setA.attributes[i].name, valueSetA: scope.setA.attributes[i].value, valueSetB: scope.setB.attributes[i].value });
              }
            }
          }           
        };

        scope.$watch('setA.attributes', function( oldVal, newVal ) {
             if(newVal) {
               console.log( "setA changed" );
               updateDiff();
             }
         });        

        scope.$watch('setB.attributes', function( oldVal, newVal ) {
             if(newVal) {
               console.log( "setB changed" );
               updateDiff();
             }
         });        
    }    
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

.controller('NodeRelationshipListCtrl', function($scope, $rootScope, $element, NodeRelationship) {
  'use strict';

  $scope.loadNodeRelationshipList = function( studyUuid, assayUuid ) {
    return NodeRelationship.get(
        {study__uuid: studyUuid, assay__uuid: assayUuid, order_by: [ "-is_current", "name" ] },
        function( response ) {
          // check if there is a "current mapping" in the list (this would be the first entry due to the ordering)
          if ( ( ( response.objects.length > 0 ) && ( !response.objects[0].is_current ) ) || ( response.objects.length === 0 ) ) {
            $scope.createCurrentNodeRelationship( "Current Mapping", "1-N" );
          }

          $scope.nodeRelationshipList = response.objects;
          console.log( "# of node relationships: " + $scope.nodeRelationshipList.length );
      });    
  };

  var NodeRelationshipList =  $scope.loadNodeRelationshipList( externalStudyUuid, externalAssayUuid );

  $scope.createCurrentNodeRelationship = function( name, type ) {
    $scope._createNodeRelationship( name, type, "", true );
  };

  $scope.createNodeRelationship = function( name, summary, type ) {
    $scope._createNodeRelationship( name, summary, type, false );
  };

  $scope._createNodeRelationship = function( name, summary, type, is_current ) {
    //internal method -- call createNodeRelationship or createCurrentNodeRelationship

    var nodeRelationship = new NodeRelationship( {study: "/api/v1/study/" + externalStudyUuid + "/", assay: "/api/v1/assay/" + externalAssayUuid + "/", node_pairs: [], name: name, summary: summary, type: type, is_current: is_current } );

    nodeRelationship.$save( 
      function( response ) {
        // add new current mapping to list
        $scope.nodeRelationshipList.unshift( response );
        $scope.currentNodeRelationship = response;
        $scope.nodeRelationshipIndex = 0;
        // update the current node relationship (fires event)
        $scope.updateCurrentNodeRelationship();
      });
  };

  $scope.deleteNodeRelationship = function( nodeRelationship ) {
    console.log( "deleting node relatnsiophns" );
    console.log( nodeRelationship );
    if ( nodeRelationship.is_current ) {
      alert( "Cannot delete current node relationship" );
    }
    else {
      NodeRelationship.delete( { uuid: nodeRelationship.uuid },
        function( response ) {
          alert( "Successfully deleted " + nodeRelationship );
          $scope.currentNodeRelationship = null;
          $scope.loadNodeRelationshipList( externalStudyUuid, externalAssayUuid );
          // update the current node relationship (fires event)
          $scope.updateCurrentNodeRelationship();
        });      
    }
  };

  $scope.updateCurrentNodeRelationship = function() {
    $scope.currentNodeRelationship = $scope.nodeRelationshipList[$scope.nodeRelationshipIndex];  

    $rootScope.$emit( "nodeRelationshipChangedEvent", $scope.currentNodeRelationship, $scope.nodeRelationshipIndex );
  };  

  $scope.$onRootScope('nodeRelationshipChangedEvent', function( event, currentNodeRelationship, index ) {
    $scope.nodeRelationshipIndex = index;
  });

})

.controller('DataSetUiModeCtrl', function($scope, $location, $rootScope) {
  $rootScope.mode = DATA_SET_UI_MODE_BROWSE;

  $scope.$onRootScope('workflowChangedEvent', function( event, currentWorkflow ) {
    $scope.currentWorkflow = currentWorkflow;  
  });  

  $scope.$onRootScope('nodeRelationshipChangedEvent', function( event, currentNodeRelationship ) {
    $scope.currentNodeRelationship = currentNodeRelationship;
  });  
})

.factory("NodeSetList", function($resource) {
  'use strict';

  return $resource(
    "/api/v1/nodesetlist/", {format: "json"}
  );
})

.factory("NodeRelationship", function($resource) {
  'use strict';

  return $resource(
    "/api/v1/noderelationship/:uuid/", {
      format: "json",
    }, 
    {
      'update': { method:'PUT' },
      'update_partial': { method:'PATCH' }
    }
  );
})

.factory("NodePair", function($resource, $http) {
  'use strict';

  return $resource(
    '/api/v1/nodepair/:uuid/', {
      format: 'json'
    },
    {
      // use different url (from: https://github.com/angular/angular.js/pull/2054) - 
      'load_from_uri': { method: 'GET', url: "/:uri", params: { "format": "json" } }
    }
  );
})

.factory("AttributeOrder", function($resource) {
  'use strict';

  return $resource(
    '/api/v1/attributeorder/', {
      format: 'json',
      is_internal: 'false',
      is_exposed: 'true',
    }
  );
})

.run(['$state', function ($state,$scope) {
   $state.transitionTo('browse');
}]);

