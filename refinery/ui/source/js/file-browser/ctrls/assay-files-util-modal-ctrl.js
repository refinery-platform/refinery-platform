(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('AssayFilesUtilModalCtrl', AssayFilesUtilModalCtrl);

  AssayFilesUtilModalCtrl.$inject = [
    '$log',
    '$q',
    '$scope',
    '$uibModalInstance',
    '$window',
    'fileBrowserFactory',
    'selectedFilterService'
  ];

  function AssayFilesUtilModalCtrl (
    $log,
    $q,
    $scope,
    $uibModalInstance,
    $window,
    fileBrowserFactory,
    selectedFilterService
  ) {
    var vm = this;
    vm.assayAttributeOrder = [];
    vm.close = close;
    vm.isAttributeSelected = isAttributeSelected;
    vm.refreshAssayAttributes = refreshAssayAttributes;
    vm.updateAssayAttributes = updateAssayAttributes;
    vm.updateAttributeRank = updateAttributeRank;

    activate();
    /*
     * -----------------------------------------------------------------------------
     * Methods
     * -----------------------------------------------------------------------------
     */
    function activate () {
      refreshAssayAttributes();
    }

    // modal close button
    function close () {
      $uibModalInstance.close('close');
    }

    function isAttributeSelected (internalName) {
      if (selectedFilterService.attributeSelectedFields.hasOwnProperty(internalName)) {
        return true;
      }
      return false;
    }

    // Refresh attribute lists when modal opens
    function refreshAssayAttributes () {
      var assayUuid = $window.externalAssayUuid;
      fileBrowserFactory.getAssayAttributeOrder(assayUuid).then(function () {
        vm.assayAttributeOrder = fileBrowserFactory.assayAttributeOrder;
      }, function (error) {
        $log.error(error);
      });
    }

    // Update ranks and attributes for owners
    function updateAssayAttributes (attributeParam) {
      fileBrowserFactory.postAssayAttributeOrder(attributeParam).then(function () {
      });
    }

    // update rank of item moved
    function updateAttributeRank (attributeObj, index) {
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
    }
  }
})();
