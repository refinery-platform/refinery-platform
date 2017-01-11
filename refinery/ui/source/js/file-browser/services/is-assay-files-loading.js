'use strict';

function filesLoadingService () {
  var vm = this;
  vm.isAssayFilesLoading = true;

  vm.setIsAssayFilesLoading = function (status) {
    if (status === true) {
      vm.isAssayFilesLoading = status;
    } else if (status === false) {
      vm.isAssayFilesLoading = status;
    }
    return vm.isAssayFilesLoading;
  };
}

angular.module('refineryFileBrowser')
  .service('filesLoadingService', [
    filesLoadingService
  ]
);
