'use strict';

function DataSetUiModeCtrl ($scope, $location, $rootScope) {
  $rootScope.mode = 'browse';

  $scope.$onRootScope(
    'workflowChangedEvent',
    function (event, currentWorkflow) {
      $scope.currentWorkflow = currentWorkflow;
    }
  );

  $scope.$onRootScope(
    'nodeRelationshipChangedEvent',
    function (event, currentNodeRelationship) {
      $scope.currentNodeRelationship = currentNodeRelationship;
    }
  );
}

angular
  .module('refineryNodeMapping')
  .controller('DataSetUiModeCtrl', [
    '$scope', '$location', '$rootScope', DataSetUiModeCtrl
  ]);
