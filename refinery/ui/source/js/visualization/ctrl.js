'use strict';

function VisualizationCtrl (
  $scope,
  $uibModal,
  $compile,
  $templateCache
) {
  var vm = this;

  // the visualizations model contains the modal partial
  vm.visualizations = [
    { name: 'IGV', template: 'i-g-v-launch-modal.html' }
  ];
  vm.selectedVisualization = { select: null };

  vm.launchVisualization = function () {
    var template = $templateCache.get(vm.selectedVisualization.select.template);
    var modalContent = $compile(template)($scope);

    $uibModal.open({
      template: modalContent,
      controller: 'IGVCtrl',
      controllerAs: 'ICtrl'
    });
  };
}

angular
  .module('refineryVisualization')
  .controller('VisualizationCtrl', [
    '$scope',
    '$uibModal',
    '$compile',
    '$templateCache',
    VisualizationCtrl
  ]);
