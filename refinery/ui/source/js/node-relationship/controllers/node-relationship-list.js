'use strict';

function NodeRelationshipListCtrl (
  $scope,
  $rootScope,
  $element,
  $log,
  $window,
  $uibModal,
  NodeRelationshipResource,
  nodeRelationshipService
) {
  $scope.nodeRelationshipList = [];
  $scope.selectedNodeRelationship = { select: $scope.nodeRelationshipList[0] };

  $scope.$onRootScope(
    'workflowChangedEvent',
    function (event, currentWorkflow) {
      $scope.currentWorkflow = currentWorkflow;

      $scope.currentNodeRelationship = null;

      $rootScope.$emit(
        'nodeRelationshipChangedEvent',
        $scope.currentNodeRelationship,
        undefined
      );
    }
  );

  $scope.$onRootScope(
    'nodeRelationshipChangedEvent',
    function (event, currentNodeRelationship, index) {
      $log.debug($scope.selectedNodeRelationship);
      $log.debug(index);
      $log.debug($scope.nodeRelationshipList);
    }
  );

  var successDelete = function (response) {
    $log.debug(response);
    $log.debug('Successfully deleted ' + response.name);

    $scope.currentNodeRelationship = null;
    $scope.selectedNodeRelationship.select = $scope.nodeRelationshipList[0];
    $scope.loadNodeRelationshipList(
      $window.externalStudyUuid, $window.externalAssayUuid
    );
    // update the current node relationship (fires event)
    $scope.updateCurrentNodeRelationship();
  };

  var successCreate = function (response) {
    $scope.loadNodeRelationshipList(
      $window.externalStudyUuid, $window.externalAssayUuid, response
    );
  };

  var successUpdate = function (response) {
    $scope.loadNodeRelationshipList(
      $window.externalStudyUuid, $window.externalAssayUuid, response
    );
  };

  $scope.loadNodeRelationshipList = function (
    studyUuid, assayUuid, selectedNodeRelationship
  ) {
    return NodeRelationshipResource.get({
      study__uuid: studyUuid,
      assay__uuid: assayUuid,
      order_by: ['-is_current', 'name']
    },
      function (response) {
        // check if there is a 'current mapping' in the list (this would be the
        // first entry due to the ordering)
        if (
          (response.objects.length > 0 && !response.objects[0].is_current) ||
          response.objects.length === 0
        ) {
          nodeRelationshipService.createCurrentNodeRelationship(
            'Current Mapping',
            '1-N',
            function () {
              $scope.loadNodeRelationshipList(
                $window.externalStudyUuid,
                $window.externalAssayUuid
              );
            },
            function (_response) {
              $log.error(_response);
            });
        }

        $scope.nodeRelationshipList = response.objects;

        // if a node relationship should be selected: find its index
        if (selectedNodeRelationship) {
          $scope.selectedNodeRelationship.select = selectedNodeRelationship;
          $scope.updateCurrentNodeRelationship();
        }
      });
  };

  $scope.findNodeRelationshipListIndex = function (nodeRelationship) {
    for (var i = 0; i < $scope.nodeRelationshipList.length; ++i) {
      if ($scope.nodeRelationshipList[i].uuid === nodeRelationship.uuid) {
        return i;
      }
    }

    return -1;
  };

  $scope.updateCurrentNodeRelationship = function () {
    $scope.currentNodeRelationship = $scope.selectedNodeRelationship.select;

    if ($scope.currentNodeRelationship) {
      $rootScope.$emit(
        'nodeRelationshipChangedEvent',
        $scope.currentNodeRelationship,
        $scope.selectedNodeRelationship.select
      );
    }
  };


  $scope.openNewMappingDialog = function () {
    $scope.newMappingDialogConfig = {
      title: 'New File Mapping',
      text: 'Enter a name for the mapping.',
      val: 'New Mapping'
    };

    var modalInstance = $uibModal.open({
      templateUrl: '/static/partials/node-relationship/dialogs/input-dialog.html',
      controller: 'InputDialogInstanceCtrl',
      resolve: {
        config: function () {
          return $scope.newMappingDialogConfig;
        }
      }
    });

    modalInstance.result.then(function (val) {
      $scope.val = val;
      nodeRelationshipService.createNodeRelationship(
        val,
        'Test',
        '1-N',
        successCreate,
        function (response) {
          $log.error(response);
        });
    }, function () {
      $log.info('Modal dismissed at: ' + new Date());
    });
  };

  $scope.openRenameMappingDialog = function (nodeRelationship) {
    $scope.renameMappingDialogConfig = {
      title: 'Rename File Mapping',
      text: 'Enter a new name for the mapping ' + nodeRelationship.name + '.',
      val: nodeRelationship.name
    };

    var modalInstance = $uibModal.open({
      templateUrl: '/static/partials/node-relationship/dialogs/input-dialog.html',
      controller: 'InputDialogInstanceCtrl',
      resolve: {
        config: function () {
          return $scope.renameMappingDialogConfig;
        }
      }
    });

    modalInstance.result.then(function (val) {
      $scope.val = val;
      nodeRelationship.name = val;
      nodeRelationshipService.updateNodeRelationship(
        nodeRelationship,
        successUpdate,
        function (error) {
          $log.error(error);
        });
    }, function () {
      $log.info('Modal dismissed at: ' + new Date());
    });
  };


  $scope.openDeleteMappingDialog = function (nodeRelationship) {
    $scope.newDeleteMappingDialogConfig = {
      title: 'Delete File Mapping?',
      text: 'Are you sure you want to delete the file mapping ' +
        nodeRelationship.name + '?'
    };

    var modalInstance = $uibModal.open({
      templateUrl: '/static/partials/node-relationship/dialogs/confirmation-dialog.html',
      controller: 'NRConfirmationDialogInstanceCtrl',
      resolve: {
        config: function () {
          return $scope.newDeleteMappingDialogConfig;
        }
      }
    });

    modalInstance.result.then(function () {
      nodeRelationshipService.deleteNodeRelationship(
        nodeRelationship,
        successDelete,
        function (error) {
          $log.error(error);
        }
      );
    }, function () {
      $log.info('Modal dismissed at: ' + new Date());
    });
  };

  // initialize list of node relationships
  $scope.loadNodeRelationshipList(
    $window.externalStudyUuid, $window.externalAssayUuid
  );
}

angular
  .module('refineryNodeRelationship')
  .controller('NodeRelationshipListCtrl', [
    '$scope',
    '$rootScope',
    '$element',
    '$log',
    '$window',
    '$uibModal',
    'NodeRelationshipResource',
    'nodeRelationshipService',
    NodeRelationshipListCtrl
  ]);
