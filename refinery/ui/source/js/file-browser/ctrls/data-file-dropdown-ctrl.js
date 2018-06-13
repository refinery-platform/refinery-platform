/**
 * Data File Dropdown Ctrl
 * @namespace dataFileDropdownCtrl
 * @desc Component controller for data file dropdown in the UI-Grid table.
 * @memberOf refineryApp.refineryFileBrowser
 */
(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('DataFileDropdownCtrl', DataFileDropdownCtrl);

  DataFileDropdownCtrl.$inject = ['$uibModal'];


  function DataFileDropdownCtrl (
    $uibModal
  ) {
    var vm = this;
    vm.openDataFileModal = openDataFileModal;

     /**
     * @name openDataFileModal
     * @desc  VM method open modal to add/remove data file
     * @memberOf refineryDashboard.CollaborationCardCtrl
    **/
    function openDataFileModal (fileAction, node) {
      var modalInstance = $uibModal.open({
        component: 'rpDataFileEditModal',
        backdrop: 'static',
        resolve: {
          config: function () {
            return {
              fileAction: fileAction,
              nodeObj: node
            };
          }
        }
      });
      modalInstance.result.then(function (response) {
        console.log(response);
      });
    }
  }
})();
