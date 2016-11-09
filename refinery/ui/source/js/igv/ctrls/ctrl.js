'use strict';

function IGVCtrl (
  $scope,
  $window,
  $log,
  $resource,
  $httpParamSerializer,
  $uibModalInstance,
  nodeGroupService,
  selectedFilterService,
  selectedNodesService,
  IGVFactory
) {
  var vm = this;
  // includes unused fields to accomodate current igv backend
  vm.igvConfig = {
    query: null,
    annotation: null,
    node_selection: [],
    node_selection_blacklist_mode: true
  };
  vm.speciesList = [];
  vm.selectedSpecies = { select: vm.speciesList[0] };
  vm.message = null;
  vm.messageType = 'info';
  vm.isLoadingSpecies = true;

  // Helper method to set alert message in modal
  var generateAlertMessage = function (infoType) {
    vm.messageType = infoType;
    if (infoType === 'error') {
      vm.message = 'Sorry! Unable to configure IGV for the selected file set.';
    } else if (vm.speciesList.length === 0) {
      vm.message = 'Please select the correct genome and launch IGV.';
    } else if (vm.speciesList.length === 1) {
      vm.message = null;
      vm.selectedSpecies.select = vm.speciesList[0];
    } else {
      vm.message = 'Multiple species detected. Please select a ' +
          'genome and launch IGV. You may repeat this step multiple times.';
    }
  };

  // Helper method set igvConfig based on selected nodes
  var setIGVConfig = function () {
    if (selectedNodesService.selectedAllFlag) {
      vm.igvConfig.node_selection = selectedNodesService.complementSelectedNodesUuids;
      vm.igvConfig.node_selection_blacklist_mode = true;
      vm.igvConfig.assay_uuid = $window.externalAssayUuid;
    } else {
      vm.igvConfig.node_selection = selectedNodesService.selectedNodesUuids;
      vm.igvConfig.node_selection_blacklist_mode = false;
      vm.igvConfig.assay_uuid = $window.externalAssayUuid;
    }
  };

  // Upon launch modal, method retrives species list
  vm.retrieveSpecies = function () {
    setIGVConfig();

    IGVFactory.getSpeciesList(vm.igvConfig).then(function () {
      vm.isLoadingSpecies = false;
      // update species list
      vm.speciesList = IGVFactory.speciesList;
      generateAlertMessage('info');
    }, function () {
      vm.isLoadingSpecies = false;
      generateAlertMessage('error');
      $log.error('Error creating IGV session URLs.');
    });
  };

  // Launches web based IGV and dismissed modal
  vm.launchIgvJs = function () {
    // update current select node group
    var nodeGroupParams = {
      uuid: selectedNodesService.defaultCurrentSelectionUuid,
      assay: $window.externalAssayUuid,
      nodes: vm.igvConfig.node_selection,
      use_complement_nodes: selectedNodesService.selectedAllFlag,
      filter_attribute: selectedFilterService.selectedFieldList
    };

    var nodeGroupUpdate = nodeGroupService.update(nodeGroupParams);
    nodeGroupUpdate.$promise.then(function (response) {
      // update igv config with actual node selection (not complements)
      var params = $httpParamSerializer({
        species: vm.selectedSpecies.select.name,
        node_ids: response.nodes
      });
      // close modal
      $uibModalInstance.dismiss();
      $window.open('/visualize/genome?' + params);
    });
  };

  // Modal method to cancel
  vm.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };

  vm.retrieveSpecies();
}

angular
  .module('refineryIGV')
  .controller('IGVCtrl', [
    '$scope',
    '$window',
    '$log',
    '$resource',
    '$httpParamSerializer',
    '$uibModalInstance',
    'nodeGroupService',
    'selectedFilterService',
    'selectedNodesService',
    'IGVFactory',
    IGVCtrl
  ]);
