'use strict';

function VisualizationCtrl (
  $compile,
  $scope,
  $templateCache,
  $uibModal,
  $window,
  fileBrowserFactory,
  nodeGroupService,
  selectedFilterService,
  selectedNodesService
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

  // Helper method to return correct active nodes whether complement or selected
  var getActiveNodes = function () {
    if (selectedNodesService.selectedAllFlag) {
      return selectedNodesService.complementSelectedNodesUuids;
    }
    return selectedNodesService.selectedNodesUuids;
  };


  // Launches web based higlass
  vm.launchHiglass = function () {
    // update current select node group
    var nodeGroupParams = {
      uuid: selectedNodesService.defaultCurrentSelectionUuid,
      assay: $window.externalAssayUuid,
      nodes: getActiveNodes(),
      use_complement_nodes: selectedNodesService.selectedAllFlag,
      filter_attribute: selectedFilterService.selectedFieldList
    };

    var nodeGroupUpdate = nodeGroupService.update(nodeGroupParams);
    nodeGroupUpdate.$promise.then(function (response) {
      // update higlass config with actual node selection (not complements)
      angular.copy(response.nodes, vm.higlassConfig.node_selection);
    });
    // var params = $httpParamSerializer({
    //  node_uuids: vm.hiGlassConfig.node_selection
    // });
   // $window.open('/visualize/genome?' + params);
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
    '$compile',
    '$scope',
    '$templateCache',
    '$uibModal',
    '$window',
    'fileBrowserFactory',
    'nodeGroupService',
    'selectedFilterService',
    'selectedNodesService',
    VisualizationCtrl
  ]);
