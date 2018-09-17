(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .service('filesLoadingService', filesLoadingService);

  function filesLoadingService () {
    var vm = this;
    vm.isAssayFilesLoading = false;
    vm.setIsAssayFilesLoading = setIsAssayFilesLoading;

      /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    function setIsAssayFilesLoading (status) {
      if (status === true) {
        vm.isAssayFilesLoading = status;
      } else if (status === false) {
        vm.isAssayFilesLoading = status;
      }
      return vm.isAssayFilesLoading;
    }
  }
})();
