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

.controller('FileMappingCtrl', function($scope, $location, $rootScope, $sce, $http, NodePair, NodeRelationship, AttributeOrder, Solr ) {

  $scope.nodeDropzones = null;
  $scope.currentNodePair = null;
  $scope.currentNodePairIndex = 0;
  $scope.currentNodeRelationship = null;
  $scope.attributeOrderList = null;

  $scope.$onRootScope('workflowChangedEvent', function( event, currentWorkflow ) {
    $scope.currentWorkflow = currentWorkflow;
  });  

  $scope.$onRootScope('nodeRelationshipChangedEvent', function( event, currentNodeRelationship ) {
    $scope.currentNodeRelationship = currentNodeRelationship;
    $scope.currentNodePairIndex = 0;

    $scope.loadMapping( $scope.currentNodePairIndex );
    /*
    if ( $scope.currentNodeRelationship.node_pairs.length > 0 ) {
        console.log( $scope.currentNodeRelationship.node_pairs[0] );
        $scope.currentNodePair = NodePair.load_from_uri( { uri: decodeURIComponent( $scope.currentNodeRelationship.node_pairs[0].substring(1) ) },
          function( response, responseHeaders ) {            
            console.log( response );
          },
          function( error ) {
            console.log( error );
          });

        console.log( $scope.currentNodePair );
        //$scope.currentNodePair = $scope.currentNodeRelationship.node_pairs[0];
    }
    */

    console.log( $scope.currentNodeRelationship );
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


  $scope.createNodeRelationship = function( name, summary, type ) {
    console.log( "Creating node relationship ... ");

    var nodeRelationship = new NodeRelationship( {study: "/api/v1/study/" + externalStudyUuid + "/", assay: "/api/v1/assay/" + externalAssayUuid + "/", node_pairs: [], name: name, summary: summary, type: type } );

    nodeRelationship.$save( 
      function( response ) {
        console.log( "Created node relationship ... ");
        console.log( response );

        $scope.currentNodeRelationship = response;
      });
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
        alert( "failed to load mapping" );
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
            attributes.push( { "name": attribute, "value": data.response.docs[0][attribute] } );
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
      Solr.get({ "nodeUuid": uuid, "attributeList": attributeList.join() }, function( data ) { success( data ); }, function( data ) { error( data ); } );
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

.directive('AttributeList', function() {
  return {
    restrict: 'E',
    scope: {
      attributes: '=attributes'
    },
    templateUrl: '/static/partials/attribute_list.html'
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

  var NodeRelationshipList = NodeRelationship.get(
    {study__uuid: externalStudyUuid, assay__uuid: externalAssayUuid},
    function( response ) {
      console.log( response );
      $scope.nodeRelationshipList = response.objects;
      console.log( $scope.nodeRelationshipList.length );
  });

  $scope.updateCurrentNodeRelationship = function() {
    $scope.currentNodeRelationship = $scope.nodeRelationshipList[$scope.nodeRelationshipIndex];  

    $rootScope.$emit( "nodeRelationshipChangedEvent", $scope.currentNodeRelationship, $scope.nodeRelationshipIndex );
  };  

  $scope.$onRootScope('nodeRelationshipChangedEvent', function( event, currentNodeRelationship, index ) {
    //alert( index );
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
    }, {
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
    }
  );
})

.factory("Solr", function($resource) {
  'use strict';

  return $resource(
    '/solr/data_set_manager/select/?q=django_ct\\:data_set_manager.node&wt=json&start=0&rows=20&fq=(uuid::nodeUuid%20AND%20study_uuid::studyUuid%20AND%20assay_uuid::assayUuid)&fq=type:(%22Raw%20Data%20File%22%20OR%20%22Derived%20Data%20File%22%20OR%20%22Array%20Data%20File%22%20OR%20%22Derived%20Array%20Data%20File%22%20OR%20%22Array%20Data%20Matrix%20File%22%20OR%20%22Derived%20Array%20Data%20Matrix%20File%22)&fl=:attributeList', {
      studyUuid: externalStudyUuid,
      assayUuid: externalAssayUuid
    }
  );
})
// http://192.168.50.50:8000/solr/data_set_manager/select/?q=django_ct:data_set_manager.node&wt=json&start=0&rows=20&fq=(uuid:d21d9614-61e2-11e3-8888-080027129698%20AND%20study_uuid:d13e1cfa-61e2-11e3-8888-080027129698%20AND%20assay_uuid:d143e950-61e2-11e3-8888-080027129698)&fq=type:(%22Raw%20Data%20File%22%20OR%20%22Derived%20Data%20File%22%20OR%20%22Array%20Data%20File%22%20OR%20%22Derived%20Array%20Data%20File%22%20OR%20%22Array%20Data%20Matrix%20File%22%20OR%20%22Derived%20Array%20Data%20Matrix%20File%22)&fl=uuid,name,Author_Characteristics_2_1_s,REFINERY_NAME_2_1_s,REFINERY_ANALYSIS_UUID_2_1_s,Title_Characteristics_2_1_s,file_uuid,Year_Characteristics_2_1_s,is_annotation,Month_Characteristics_2_1_s,study_uuid,assay_uuid,type,REFINERY_TYPE_2_1_s


.run(['$state', function ($state,$scope) {
   $state.transitionTo('browse');
}]);

