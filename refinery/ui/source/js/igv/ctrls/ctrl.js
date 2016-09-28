'use strict';

function IGVCtrl (
  $scope,
  $window,
  $log,
  $resource,
  $httpParamSerializer,
  selectedNodesService,
  $uibModalInstance,
  IGVFactory
) {
  var vm = this;
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

  vm.retrieveSpecies = function () {
    if (selectedNodesService.selectedAllFlag) {
      vm.igvConfig.node_selection = selectedNodesService.complementSelectedNodesUuids;
      vm.igvConfig.node_selection_blacklist_mode = true;
    } else {
      vm.igvConfig.node_selection = selectedNodesService.selectedNodesUuids;
      vm.igvConfig.node_selection_blacklist_mode = false;
      vm.igvConfig.assay_uuid = $window.externalAssayUuid;
    }

    IGVFactory.getSpeciesList(vm.igvConfig).then(function () {
      vm.isLoadingSpecies = false;
      // update species list
      vm.speciesList = IGVFactory.speciesList;
      generateAlertMessage('info');
    }, function () {
      vm.isLoadingSpecies = false;
      generateAlertMessage('error');
      $log.error('Error creating IGV session URLs. (error status ' + status + ')');
    });
  };

  vm.launchIgvJs = function () {
    var params = $httpParamSerializer({
      species: vm.selectedSpecies.select.name,
      node_ids: vm.igvConfig.node_selection
    });
    // close modal
    $uibModalInstance.dismiss();
    $window.open('/visualize/genome?' + params);
  };

  vm.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };

  vm.areSelectedNodesEmpty = function () {
    if (selectedNodesService.selectedNodesUuids.length > 0 ||
      selectedNodesService.complementSelectedNodesUuids.length > 0) {
      return false;
    }
    return true;
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
    'selectedNodesService',
    '$uibModalInstance',
    'IGVFactory',
    IGVCtrl
  ]);
