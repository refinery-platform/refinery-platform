'use strict';

function FileMappingCtrl (
  $timeout,
  $resource,
  $log,
  $scope,
  $location,
  $rootScope,
  $sce,
  $http,
  $window,
  _,
  NodePairResource,
  NodeRelationshipResource,
  AttributeOrder,
  nodeAttributes,
  solrService
) {
  $scope.nodeDropzones = null;
  $scope.currentNodePair = null;
  $scope.currentNodePairIndex = 0;
  $scope.currentNodeRelationship = null;
  $scope.attributeOrderList = null;

  $scope.$onRootScope(
    'nodeRelationshipChangedEvent', function (event, currentNodeRelationship) {
      $scope.currentNodeRelationship = currentNodeRelationship;

      if (!$scope.currentNodeRelationship) {
        return;
      }

      // calls global resizing function implemented in base.html to rescale height
      // of scrollable elements timeout is needed to execute after DOM changes.
      $timeout($window.sizing, 0);

      $scope.currentNodePairIndex = 0;
      $scope.loadMapping($scope.currentNodePairIndex);

      $scope.initializeNodeDropzones(
        $scope.currentWorkflow.input_relationships[0].set1,
        $scope.currentWorkflow.input_relationships[0].set2
      );
    });

  $scope.initializeNodeDropzones = function (name0, name1) {
    $scope.nodeDropzones = {
      0: {
        name: name0 || '',
        color: 'purple',
        attributes: null,
        uuid: null
      },
      1: {
        name: name1 || '',
        color: 'green',
        attributes: null,
        uuid: null
      }
    };
  };

  $scope.initializeNodeDropzones();

  $scope.isPending = function () {
    return ($scope.currentNodePair === null);
  };

  $scope.createMapping = function () {
    $log.debug('Creating pair ... ');
    $scope.initializeNodeDropzones(
      $scope.currentWorkflow.input_relationships[0].set1,
      $scope.currentWorkflow.input_relationships[0].set2
    );
    $scope.currentNodePair = null;
    $scope.currentNodePairIndex = $scope.currentNodeRelationship.node_pairs.length;
  };

  $scope.deleteMapping = function () {
    $log.debug('Deleting pair ... ');

    if ($scope.currentNodePair) {
      // update node relationship
      $scope.currentNodeRelationship.node_pairs
        .splice($scope.currentNodePairIndex, 1);

      NodeRelationshipResource.update(
        {
          uuid: $scope.currentNodeRelationship.uuid
        },
        $scope.currentNodeRelationship,
        function () {
          // delete node pair, can't delete pair until the
          // noderelationship resource call is complete
          NodePairResource.delete(
            {
              uuid: $scope.currentNodePair.uuid
            },
            function () {
              $log.debug('Deleted pair.');
            }
          );

          $log.debug('Removed pair from node mapping.');
          if ($scope.hasNextMapping()) {
            $scope.loadPreviousMapping();
          } else {
            $scope.createMapping();
          }
        },
        function () {
          $log.error(
            'Unable to remove pair ' +
            $scope.currentNodeRelationship.uuid +
            ' from mapping ' + $scope.currentNodeRelationship.name
          );
        }
      );
    }

    $scope.initializeNodeDropzones(
      $scope.currentWorkflow.input_relationships[0].set1,
      $scope.currentWorkflow.input_relationships[0].set2
    );
  };

  $scope.deleteAllMappings = function () {
    $log.debug('Deleting mappings ... ');

    var nodePairsForDeletion = $scope.currentNodeRelationship.node_pairs;

    // update node relationship
    $scope.currentNodeRelationship.node_pairs = [];
    NodeRelationshipResource.update(
      {
        uuid: $scope.currentNodeRelationship.uuid
      },
      $scope.currentNodeRelationship,
      function () {
        $log.debug('Removed all pairs from node mapping.');
        // delete node pairs
        // TODO: handle errors
        for (var i = 0; i < nodePairsForDeletion.length; ++i) {
          NodePairResource.delete({
            uuid: nodePairsForDeletion[i].split('/').reverse()[1]
          });
        }

        $scope.createMapping();
      },
      function () {
        $log.error(
          'Unable to remove all pairs from mapping ' +
          $scope.currentNodeRelationship.name
        );
      }
    );

    $scope.initializeNodeDropzones(
      $scope.currentWorkflow.input_relationships[0].set1,
      $scope.currentWorkflow.input_relationships[0].set2
    );
  };

  $scope.loadMapping = function (index) {
    $log.debug('Loading pair ' + index + '... ');

    if ($scope.currentNodeRelationship.node_pairs.length > index) {
      var uriArr = $scope.currentNodeRelationship.node_pairs[index].split('/');
      var tempUuid = _.compact(uriArr).pop();
      $scope.currentNodePair = NodePairResource.get(
        {
          uuid: tempUuid
        },
        function (data) {
          $scope.updateNodeDropzone(0, data.node1.split('/').reverse()[1]);
          $scope.updateNodeDropzone(1, data.node2.split('/').reverse()[1]);
        },
        function () {
          $scope.currentNodePair = null;
          $log.error('Failed to load mapping.');
        }
      );
    } else {
      $scope.initializeNodeDropzones();
      $scope.currentNodePair = null;
    }
  };

  $scope.hasNextMapping = function () {
    if ($scope.currentNodeRelationship.node_pairs.length < 1) {
      return false;
    }

    return true;
  };

  $scope.loadNextMapping = function () {
    if (!$scope.hasNextMapping()) {
      return;
    }

    if (
      $scope.currentNodeRelationship.node_pairs.length <=
      ++$scope.currentNodePairIndex
    ) {
      $scope.currentNodePairIndex = 0;
    }
    $scope.loadMapping($scope.currentNodePairIndex);
  };

  $scope.loadPreviousMapping = function () {
    if (!$scope.hasNextMapping()) {
      return;
    }

    if (--$scope.currentNodePairIndex < 0) {
      $scope.currentNodePairIndex = $scope.currentNodeRelationship.node_pairs.length - 1;
    }
    $scope.loadMapping($scope.currentNodePairIndex);
  };

  $scope.updateNodeDropzone = function (dropzoneIndex, uuid) {
    $scope.nodeDropzones[dropzoneIndex].uuid = uuid;

    $scope.loadNodeAttributes(
      uuid,
      $scope.attributeOrderList,
      function (data) {
        var attributes = [];
        if (data.response.docs.length === 1) {
          angular.forEach($scope.attributeOrderList, function (attribute) {
            attributes.push({
              name: solrService.extra.prettifyFieldName(attribute, true),
              value: data.response.docs[0][attribute]
            });
          });
        } else {
          attributes = null;
        }

        $scope.nodeDropzones[dropzoneIndex].attributes = attributes;
      },
      function () {
        $scope.nodeDropzones[dropzoneIndex].attributes = null;
      }
    );
  };

  $scope.handleNodeDragStart = function (event) {
    this.style.opacity = '0.4';

    var uuid = event.srcElement.attributes['node-uuid'].value;
    event.originalEvent.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        uuid: uuid,
        html: this.innerHTML
      })
    );
  };

  $scope.handleNodeDragEnd = function () {
    this.style.opacity = '1.0';
  };

  $scope.handleNodeDrop = function (event) {
    event.preventDefault();
    event.stopPropagation();

    // reset styles
    this.style.opacity = 1.0;

    // grab dropped data (coming in a string)
    var dataString = event.originalEvent.dataTransfer.getData('text/plain');
    var data = null;

    // get dropzone index
    var dropzoneIndex = null;
    try {
      dropzoneIndex = event.target.attributes['node-dropzone-index'].value;
    } catch (exception) {
      $log.error('No dropzone index.');
    }

    // parse incoming data into object
    try {
      data = JSON.parse(dataString);
    } catch (exception) {
      $log.error(
        'Please select a node, by dragging/dropping the ' +
        'reorder icon located on the far left of each row.'
      );
    }

    if (data !== null) {
      // update dropzone
      $scope.updateNodeDropzone(dropzoneIndex, data.uuid);

      // save node pair?
      if ($scope.nodeDropzones[0].uuid && $scope.nodeDropzones[1].uuid) {
        if ($scope.isPending()) {
          $log.debug('Saving new file pair ...');
          $scope.currentNodePair = new NodePairResource(
            {
              node1: '/api/v1/node/' + $scope.nodeDropzones[0].uuid + '/',
              node2: '/api/v1/node/' + $scope.nodeDropzones[1].uuid + '/'
            }
          );

          $scope.currentNodePair.$save(function (response) {
            $scope.currentNodePair = response;
            $scope.currentNodeRelationship.node_pairs
              .push($scope.currentNodePair.resource_uri);
            NodeRelationshipResource.update({
              uuid: $scope.currentNodeRelationship.uuid
            }, $scope.currentNodeRelationship);
            $log.debug('New file pair saved.');
          });
        } else {
          $log.debug('Updating existing file pair ...');
          $scope.currentNodePair.node1 = '/api/v1/node/' +
            $scope.nodeDropzones[0].uuid + '/';
          $scope.currentNodePair.node2 = '/api/v1/node/' +
            $scope.nodeDropzones[1].uuid + '/';
          $scope.currentNodePair.$update(function (response) {
            if ($scope.currentNodePair === response) {
              $log.debug('Existing file pair updated.');
            } else {
              $scope.currentNodePair = response;
              $log.debug('Error updating file pair, please try again.');
              var node1Arr = $scope.currentNodePair.node1.split('/');
              var node2Arr = $scope.currentNodePair.node2.split('/');
              var tempUuid1 = _.compact(node1Arr).pop();
              var tempUuid2 = _.compact(node2Arr).pop();
              $scope.updateNodeDropzone(0, tempUuid1);
              $scope.updateNodeDropzone(1, tempUuid2);
            }
          });
        }
      }
      $scope.$apply();
    }
  };

  $scope.handleNodeDragEnter = function (event) {
    // Necessary. Allows us to drop.
    event.preventDefault();
    // See the section on the DataTransfer object.
    event.originalEvent.dataTransfer.dropEffect = 'move';

    this.style.opacity = 0.5;

    return false;
  };

  $scope.handleNodeDragLeave = function (event) {
    // Necessary. Allows us to drop.
    event.preventDefault();
    // See the section on the DataTransfer object.
    event.originalEvent.dataTransfer.dropEffect = 'move';

    this.style.opacity = 1.0;

    return false;
  };

  $scope.handleNodeDragOver = function (event) {
    // Necessary. Allows us to drop.
    event.preventDefault();
    // See the section on the DataTransfer object.
    event.originalEvent.dataTransfer.dropEffect = 'move';

    return false;
  };

  $scope.loadNodeAttributes = function (
    nodeUuid, attributeList, success, error
  ) {
    nodeAttributes(
      $window.externalStudyUuid,
      $window.externalAssayUuid,
      nodeUuid,
      attributeList
    ).then(success).catch(error);
  };

  AttributeOrder.get({
    study__uuid: $window.externalStudyUuid,
    assay__uuid: $window.externalAssayUuid
  }, function (response) {
    $scope.attributeOrderList = [];
    for (var i = 0; i < response.objects.length; ++i) {
      $scope.attributeOrderList.push(response.objects[i].solr_field);
    }
  });
}

angular
  .module('refineryNodeMapping')
  .controller('FileMappingCtrl', [
    '$timeout',
    '$resource',
    '$log',
    '$scope',
    '$location',
    '$rootScope',
    '$sce',
    '$http',
    '$window',
    '_',
    'NodePairResource',
    'NodeRelationshipResource',
    'AttributeOrder',
    'nodeAttributes',
    'solrService',
    FileMappingCtrl
  ]);
