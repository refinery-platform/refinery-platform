'use strict';

function VisualizationCtrl (
  $scope,
  $uibModal,
  launchVisualizationService
) {
  var vm = this;

  vm.visualizations = ['IGV'];
  vm.selectedVisualization = { select: null };

  vm.launchVisualization = function () {
    if (vm.selectedVisualization.select === 'IGV') {
      console.log('visualize ctrl');
      launchVisualizationService.setVisualizationSelection('IGV');
    }
  };

  $scope.launch = function () {
    $scope.showModal('launch');
  };

  $scope.modes = { mode: '' };

  $scope.showModal = function (action) {
    if (!$scope.modes.mode) {
      return;
    }
    $scope.action = action;
    $scope.modal = $uibModal.open({
      templateUrl: $scope.modes.mode + '.html',
      scope: $scope
    });
  };

  $scope.ok = function () {
    $scope.modal.close();
  };

  $scope.cancel = function () {
    $scope.modal.dismiss();
  };
}

angular
  .module('refineryVisualization')
  .controller('VisualizationCtrl', [
    '$scope',
    '$uibModal',
    'launchVisualizationService',
    VisualizationCtrl
  ]);
