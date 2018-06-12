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
    function openDataFileModal (action, nodeUuid) {
      var modalInstance = $uibModal.open({
        component: 'rpDataFileEditModal',
        resolve: {
          config: function () {
            return {
              action: action,
              nodeUuid: nodeUuid
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
