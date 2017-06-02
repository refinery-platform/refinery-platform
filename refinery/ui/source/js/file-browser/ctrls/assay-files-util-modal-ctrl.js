'use strict';

function AssayFilesUtilModalCtrl (
  fileBrowserFactory,
  $log,
  $q,
  $scope,
  selectedFilterService,
  $uibModalInstance,
  $window
) {
  var vm = this;
  vm.assayAttributeOrder = [];

  // modal close button
  vm.close = function () {
    $uibModalInstance.close('close');
  };

  // Refresh attribute lists when modal opens
  vm.refreshAssayAttributes = function () {
    var assayUuid = $window.externalAssayUuid;
    fileBrowserFactory.getAssayAttributeOrder(assayUuid).then(function () {
      vm.assayAttributeOrder = fileBrowserFactory.assayAttributeOrder;
    }, function (error) {
      $log.error(error);
    });
  };

  // Update ranks and attributes for owners
  vm.updateAssayAttributes = function (attributeParam) {
    fileBrowserFactory.postAssayAttributeOrder(attributeParam).then(function () {
    });
  };

  // update rank of item moved
  vm.updateAttributeRank = function (attributeObj, index) {
    // when item is moved, it's duplication is removed
    vm.assayAttributeOrder.splice(index, 1);

    for (var i = 0; i < vm.assayAttributeOrder.length; i++) {
      // locally update all ranks
      vm.assayAttributeOrder[i].rank = i + 1;
      if (vm.assayAttributeOrder[i].solr_field === attributeObj.solr_field) {
        // post rank update for attribute moved
        vm.updateAssayAttributes(vm.assayAttributeOrder[i]);
      }
    }
  };

  vm.isAttributeSelected = function (internalName) {
    if (selectedFilterService.attributeSelectedFields.hasOwnProperty(internalName)) {
      return true;
    }
    return false;
  };

  vm.refreshAssayAttributes();
}

angular
  .module('refineryFileBrowser')
  .controller(
  'AssayFilesUtilModalCtrl',
  [
    'fileBrowserFactory',
    '$log',
    '$q',
    '$scope',
    'selectedFilterService',
    '$uibModalInstance',
    '$window',
    AssayFilesUtilModalCtrl
  ]
  );
