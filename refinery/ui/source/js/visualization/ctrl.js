'use strict';

function VisualizationCtrl (
  $scope,
  $uibModal,
  launchVisualizationService
) {
  var vm = this;

  vm.visualizations = [
    { name: 'IGV', template: 'i-g-v-launch-modal.html' }
  ];
  vm.selectedVisualization = { select: null };

  vm.launchVisualization = function () {
    console.log(launchVisualizationService.visualizationSelection);
    $scope.modal = $uibModal.open({
     // templateUrl: $scope.modes.mode + '.html',
      templateUrl: vm.selectedVisualization.select.template,
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
