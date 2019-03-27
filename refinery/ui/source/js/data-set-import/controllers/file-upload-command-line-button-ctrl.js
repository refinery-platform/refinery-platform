(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .controller('FileUploadCommandLineButtonCtrl', FileUploadCommandLineButtonCtrl);

  FileUploadCommandLineButtonCtrl.$inject = ['$uibModal'];

  function FileUploadCommandLineButtonCtrl (
    $uibModal
  ) {
    var vm = this;
    vm.launchCommandLineModal = launchCommandLineModal;

    function launchCommandLineModal () {
      console.log('launching');
      var modalInstance = $uibModal.open({
        component: 'rpFileUploadCommandLineModal'
      });
      modalInstance.result.then(function () {
        console.log('modal closes');
      });
    }
  }
})();
