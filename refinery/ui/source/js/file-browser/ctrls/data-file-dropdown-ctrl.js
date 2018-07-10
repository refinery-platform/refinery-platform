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

  DataFileDropdownCtrl.$inject = [
    '$scope',
    '$uibModal',
    'dataSetPropsService',
    'resetGridService'
  ];


  function DataFileDropdownCtrl (
    $scope,
    $uibModal,
    dataSetPropsService,
    resetGridService
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
        if (response === 'success') {
          resetGridService.setRefreshGridFlag(true);
        }
      });
    }

    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return dataSetPropsService.dataSet;
        },
        function () {
          vm.dataSet = dataSetPropsService.dataSet;
        }
      );
    };
  }
})();
