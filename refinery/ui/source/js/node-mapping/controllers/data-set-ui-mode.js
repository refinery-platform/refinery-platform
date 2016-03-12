angular
  .module('refineryNodeMapping')
  .controller('DataSetUiModeCtrl', function($scope, $location, $rootScope) {
    $rootScope.mode = 'browse';

    $scope.$onRootScope('workflowChangedEvent', function( event, currentWorkflow ) {
      $scope.currentWorkflow = currentWorkflow;
    });

    $scope.$onRootScope('nodeRelationshipChangedEvent', function( event, currentNodeRelationship ) {
      $scope.currentNodeRelationship = currentNodeRelationship;
    });
  });
