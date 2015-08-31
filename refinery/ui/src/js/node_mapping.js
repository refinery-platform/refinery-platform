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
  'ui.bootstrap',
])

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

.controller('FileMappingCtrl', function($timeout, $resource, $log, $scope, $location, $rootScope, $sce, $http, NodePairResource, NodeRelationshipResource, AttributeOrder, solrFactory, solrService ) {

  $scope.nodeDropzones = null;
  $scope.currentNodePair = null;
  $scope.currentNodePairIndex = 0;
  $scope.currentNodeRelationship = null;
  $scope.attributeOrderList = null;

  $scope.$onRootScope('nodeRelationshipChangedEvent', function( event, currentNodeRelationship ) {
    $scope.currentNodeRelationship = currentNodeRelationship;

    if ( !$scope.currentNodeRelationship ) {
      return;
    }

    // calls global resizing function implemented in base.html to rescale height of scrollable elements
    // timeout is needed to execute after DOM changes
    $timeout( sizing, 0 );

    $scope.currentNodePairIndex = 0;
    $scope.loadMapping( $scope.currentNodePairIndex );

    $scope.initializeNodeDropzones( $scope.currentWorkflow.input_relationships[0].set1, $scope.currentWorkflow.input_relationships[0].set2 );
  });

  $scope.initializeNodeDropzones = function( name0, name1 ) {
    name0 = name0 || "";
    name1 = name1 || "";

    $scope.nodeDropzones = {
        "0": {
          "name": name0,
          "color": "purple",
          "attributes": null,
          "uuid": null
        },
        "1": {
          "name": name1,
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
    $log.debug( "Creating pair ... ");
    $scope.initializeNodeDropzones( $scope.currentWorkflow.input_relationships[0].set1, $scope.currentWorkflow.input_relationships[0].set2 );
    $scope.currentNodePair = null;
    $scope.currentNodePairIndex = $scope.currentNodeRelationship.node_pairs.length;
  };

  $scope.deleteMapping = function() {
    $log.debug( "Deleting pair ... ");

    if ( $scope.currentNodePair ) {
      // update node relationship
      $scope.currentNodeRelationship.node_pairs.splice( $scope.currentNodePairIndex, 1 );
      NodeRelationshipResource.update({uuid: $scope.currentNodeRelationship.uuid}, $scope.currentNodeRelationship, function(){
        $log.debug("Removed pair from node mapping.");
        if ($scope.hasNextMapping()) {
          $scope.loadPreviousMapping();
        }
        else {
          $scope.createMapping();
        }
      }, function() {
        $log.error( "Unable to remove pair " + $scope.currentNodeRelationship.uuid + " from mapping " + $scope.currentNodeRelationship.name );
        // TODO: show error message
      });

      // delete node pair
      NodePairResource.delete({uuid: $scope.currentNodePair.uuid}, function(){
        $log.debug( "Deleted pair." );
      });
    }
    $scope.initializeNodeDropzones( $scope.currentWorkflow.input_relationships[0].set1, $scope.currentWorkflow.input_relationships[0].set2 );
  };

  $scope.deleteAllMappings = function() {
    $log.debug( "Deleting mappings ... ");

    var nodePairsForDeletion = $scope.currentNodeRelationship.node_pairs;

    // update node relationship
    $scope.currentNodeRelationship.node_pairs = [];
    NodeRelationshipResource.update({uuid: $scope.currentNodeRelationship.uuid}, $scope.currentNodeRelationship, function(){
      $log.debug("Removed all pairs from node mapping.");
      $scope.createMapping();
    }, function() {
      $log.error( "Unable to remove all pairs from mapping " + $scope.currentNodeRelationship.name );
      // TODO: show error message
    });

    // delete node pairs
    // TODO: handle errors
    for ( var i = 0; i < nodePairsForDeletion.length; ++i ) {
      NodePairResource.delete({uuid: nodePairsForDeletion[i].split("/").reverse()[1] });
    }

    $scope.initializeNodeDropzones( $scope.currentWorkflow.input_relationships[0].set1, $scope.currentWorkflow.input_relationships[0].set2 );
  };

  $scope.loadMapping = function( index ) {
    $log.debug( "Loading pair " + index + "... ");

    if ( $scope.currentNodeRelationship.node_pairs.length > index ) {
      $scope.currentNodePair = $resource( $scope.currentNodeRelationship.node_pairs[index], { format: 'json' } ).get( {}, function ( data ) {
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

  $scope.hasNextMapping = function () {
    if ( $scope.currentNodeRelationship.node_pairs.length < 1 ) {
      return false;
    }

    return true;
  };

  $scope.loadNextMapping = function() {
    if ( !$scope.hasNextMapping() ) {
      return;
    }

    if ( $scope.currentNodeRelationship.node_pairs.length <= ++$scope.currentNodePairIndex ) {
      $scope.currentNodePairIndex = 0;
    }
    $scope.loadMapping( $scope.currentNodePairIndex );
  };

  $scope.loadPreviousMapping = function() {
    if ( !$scope.hasNextMapping() ) {
      return;
    }

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
            attributes.push( { "name": solrService.extra.prettifyFieldName( attribute, true ), "value": data.response.docs[0][attribute] } );
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
        // here we have to deal with browser specific differences in the dropevent event data structure
        if ( e.srcElement ) {
          // safari, chrome
          dropzoneIndex = e.srcElement.attributes['node-dropzone-index'].value;
        }
        else if ( e.originalTarget ) {
          // firefox
          dropzoneIndex = e.originalTarget.attributes['node-dropzone-index'].value;
        }
        else {
          // this browser doesn't seem to support any dragstart known to us
          console.error( "Unable to obtain dropzone index of droppable.");
        }
      }
      catch( exception ) {
        console.error( "No dropzone index." );
      }

      // parse incoming data into object
      try {
        data = JSON.parse( dataString );
      }
      catch ( exception ) {
        console.error("Parsing error: " + exception);
      }

      // update dropzone
      $scope.updateNodeDropzone( dropzoneIndex, data.uuid );

      // save node pair?
      if ( $scope.nodeDropzones[0].uuid && $scope.nodeDropzones[1].uuid ) {
        if ( $scope.isPending() ) {
          $log.debug("Saving new file pair ...");
          $scope.currentNodePair = new NodePairResource( { node1: "/api/v1/node/" + $scope.nodeDropzones[0].uuid + "/", node2: "/api/v1/node/" + $scope.nodeDropzones[1].uuid + "/" } );

          $scope.currentNodePair.$save( function( response, responseHeaders) {
            $scope.currentNodePair = response;
            $scope.currentNodeRelationship.node_pairs.push( $scope.currentNodePair.resource_uri );
            NodeRelationshipResource.update( { uuid: $scope.currentNodeRelationship.uuid }, $scope.currentNodeRelationship );
            $log.debug("New file pair saved.");
          });
        }
        else {
          $log.debug("Updating existing file pair ...");

          $scope.currentNodePair.$save( function( response, responseHeaders) {
            $scope.currentNodePair = response;
            $log.debug("Existing file pair updated.");
          });
        }

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

.directive('diffAttributeList', function($log) {
  return {
    templateUrl: '/static/partials/diff_attribute_list.tpls.html',
    restrict: 'A',
    scope: {
      setA: '=',
      setB: '='
    },
    link: function (scope, elem, attrs) {

        var updateDiff = function() {
          scope.diffAttributes = [];
          scope.commonAttributes = [];

          var i = 0;

          $log.debug( "Updating diff lists ..." );

          if ( scope.setA.attributes === null && scope.setB.attributes === null ) {
            $log.debug( "Both sets empty" );
            return;
          }

          if ( scope.setB.attributes !== null && scope.setA.attributes !== null ) {
            for ( i = 0; i < scope.setA.attributes.length; ++i ) {
              if ( scope.setA.attributes[i].name === scope.setB.attributes[i].name ) {
                if ( scope.setA.attributes[i].value === scope.setB.attributes[i].value ) {
                  scope.commonAttributes.push( { name: scope.setA.attributes[i].name, value: scope.setA.attributes[i].value });
                }
                else {
                  scope.diffAttributes.push( { name: scope.setA.attributes[i].name, valueSetA: scope.setA.attributes[i].value, valueSetB: scope.setB.attributes[i].value });
                }
              }
            }

            return;
          }

          if ( scope.setA.attributes === null ) {
            for ( i = 0; i < scope.setB.attributes.length; ++i ) {
                  scope.commonAttributes.push( { name: scope.setB.attributes[i].name, value: scope.setB.attributes[i].value });
            }

            return;
          }

          if ( scope.setB.attributes === null ) {
            for ( i = 0; i < scope.setA.attributes.length; ++i ) {
                  scope.commonAttributes.push( { name: scope.setA.attributes[i].name, value: scope.setA.attributes[i].value });
            }

            return;
          }

        };

        scope.$watch('setA.attributes', function( oldVal, newVal ) {
             if( oldVal && !newVal ) {
               $log.debug( "Attribute setA initialized" );
               updateDiff();
             }
             if(newVal) {
               $log.debug( "Attribute setA changed" );
               updateDiff();
             }
         });

        scope.$watch('setB.attributes', function( oldVal, newVal ) {
             if( oldVal && !newVal ) {
               $log.debug( "Attribute setB initialized" );
               updateDiff();
             }
             if(newVal) {
               $log.debug( "Attribute setB changed" );
               updateDiff();
             }
         });
    }
  };
})

.controller('NodeSetListApiCtrl', function($scope, $rootScope, $window, NodeSetList) {
  'use strict';

  $scope.updateCurrentNodeSet = function() {
    $scope.currentNodeSet = $scope.nodesetList[$scope.nodesetIndex];
    // FIXME: temp workaround - this should be handled through the event bus
    if ($scope.currentNodeSet) {
      $rootScope.$emit("nodeSetChangedEvent", $scope.currentNodeSet);
      // console.log($scope.currentNodeSet);
      // analysisConfig.nodeSetUuid = $scope.currentNodeSet.uuid;
      // analysisConfig.nodeRelationshipUuid = null;
    }
  };

  $scope.getCurrentNodeSet = function(){
    NodeSetList.get(
      {
        study__uuid: externalStudyUuid, assay__uuid: externalAssayUuid
      }).$promise.then(function(data){
        $scope.nodesetList = data.objects;
        $scope.updateCurrentNodeSet();

      },function(error){
        console.log("Couldn't read node set list.");
        if ($window.sessionStorage) {
            var currentSelectionSessionKey = externalStudyUuid + "_" + externalAssayUuid + "_" + "currentSelection";
            console.log( "Reading " + currentSelectionSessionKey + " from session storage" );
            $scope.nodesetList = [angular.fromJson( $window.sessionStorage.getItem(currentSelectionSessionKey))];
            $scope.updateCurrentNodeSet();
        }
        else {
          console.log(error);
        }

    });
  };

  $scope.$on('refinery/updateCurrentNodeSelection', function(){
    $scope.getCurrentNodeSet();
  });

  $scope.getCurrentNodeSet();
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


.factory("NodeSetFactory", function($resource) {
  'use strict';

  return $resource(
    "/api/v1/nodeset/", {format: "json"}
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
});
