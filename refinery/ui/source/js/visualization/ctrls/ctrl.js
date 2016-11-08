'use strict';

function VisualizationCtrl (
  $scope,
  $uibModal,
  $compile,
  $templateCache,
  fileBrowserFactory,
  selectedNodesService,
  nodeGroupService,
  $window
) {
  var vm = this;
  // the visualizations model contains the modal partial
  vm.visualizations = [
    { name: 'IGV', template: 'i-g-v-launch-modal.html' },
    { name: 'hiGlass', template: '' }
  ];
  vm.selectedVisualization = { select: null };
  vm.higlassConfig = { node_selection: [] };

  // Main method which launches modal depending on visualization selection
  vm.launchVisualization = function () {
    if (!vm.selectedVisualization.select.template) {
      vm.launchHiglass();
    } else {
      var template = $templateCache.get(vm.selectedVisualization.select.template);
      var modalContent = $compile(template)($scope);
      $uibModal.open({
        template: modalContent,
        controller: 'IGVCtrl',
        controllerAs: 'ICtrl'
      });
    }
  };

  // Helper method set highGlassConfig based on selected nodes
  var setHiglassConfig = function () {
    if (selectedNodesService.selectedAllFlag) {
      return selectedNodesService.complementSelectedNodesUuids;
    }
    return selectedNodesService.selectedNodesUuids;
  };


  // Launches web based higlass
  vm.launchHiglass = function () {
    var nodeGroupParams = {
      uuid: selectedNodesService.defaultCurrentSelectionUuid,
      assay: $window.externalAssayUuid,
      nodes: setHiglassConfig(),
      use_complement_nodes: selectedNodesService.selectedAllFlag
    };

    var nodeGroupUpdate = nodeGroupService.update(nodeGroupParams);
    nodeGroupUpdate.$promise.then(function (response) {
      angular.copy(response.nodes, vm.higlassConfig.node_selection);
    });
    // var params = $httpParamSerializer({
    //  node_uuids: vm.hiGlassConfig.node_selection
    // });
   // $window.open('/visualize/genome?' + params);
    console.log('launching higlass');
    console.log(vm.higlassConfig);
  };

  // Helper method for UI to check if any nodes are selected
  vm.areNodesSelected = function () {
    if (selectedNodesService.complementSelectedNodesUuids.length === 0 &&
      selectedNodesService.selectedNodesUuids.length === 0) {
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
    'fileBrowserFactory',
    'selectedNodesService',
    'nodeGroupService',
    '$window',
    VisualizationCtrl
  ]);
