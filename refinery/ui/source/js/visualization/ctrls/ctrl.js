'use strict';

function VisualizationCtrl (
  $scope,
  $uibModal,
  $compile,
  $templateCache,
  selectedNodesService
) {
  var vm = this;
  // the visualizations model contains the modal partial
  vm.visualizations = [
    { name: 'IGV', template: 'i-g-v-launch-modal.html' }
  ];
  vm.selectedVisualization = { select: null };

  // Main method which launches modal depending on visualization selection
  vm.launchVisualization = function () {
    var template = $templateCache.get(vm.selectedVisualization.select.template);
    var modalContent = $compile(template)($scope);
    $uibModal.open({
      template: modalContent,
      controller: 'IGVCtrl',
      controllerAs: 'ICtrl'
    });
  };

  // Helper method for UI to check if any nodes are selected
  vm.areNodesSelected = function () {
    if (selectedNodesService.complementSelectedNodesUuids.length === 0 &&
      selectedNodesService.selectedNodesUuids.length === 0 &&
      !selectedNodesService.selectedAllFlag) {
      return false;
    }
    return true;
  };
}

angular
  .module('refineryVisualization')
  .controller('VisualizationCtrl', [
    '$scope',
    '$uibModal',
    '$compile',
    '$templateCache',
    'selectedNodesService',
    VisualizationCtrl
  ]);
