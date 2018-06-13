/**
 * Data File Edit Modal Ctrl
 * @namespace DataFileEditModalCtrl
 * @desc Main controller for the add/remove modal
 * @memberOf refineryApp
 */
(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('DataFileEditModalCtrl', DataFileEditModalCtrl);

  DataFileEditModalCtrl.$inject = [
    '$log',
    'fileBrowserFactory'
  ];

  function DataFileEditModalCtrl (
    $log,
    fileBrowserFactory
  ) {
    var vm = this;

    vm.alertType = 'info';
    vm.close = close;
    vm.addFile = addFile;
    vm.generateAlertMessage = generateAlertMessage;
    vm.removeFile = removeFile;
    vm.isLoading = false;
    vm.responseMessage = '';

    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */
    /**
     * @name addFile
     * @desc  Method which add a data file
     * @memberOf refineryApp.addFile
    **/
    function addFile () {
      vm.isLoading = true;
    }

    /**
     /**
     * @name close
     * @desc  View method to close modals
     * @memberOf refineryApp.GroupAddModalCtrl
    **/
    function close () {
      $log.info('close');
      vm.modalInstance.close(vm.alertType);
    }

     /**
     * @name removeFile
     * @desc  Method which removes a data file
     * @memberOf refineryApp.removeFile
    **/
    function removeFile () {
      vm.isLoading = true;
    }

    /**
     * @name generateAlertMessage
     * @desc  Helper method which generates api response message
     * @memberOf refineryApp.GroupAddModalCtrl
    **/
    function generateAlertMessage (infoType, groupName) {
      if (infoType === 'success') {
        vm.alertType = 'success';
        vm.responseMessage = 'Successfully created group ' + groupName;
      } else if (infoType === 'danger') {
        vm.alertType = 'danger';
        vm.responseMessage = 'Error creating group. Check for group name' +
          ' duplication.';
      }
    }
      /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      vm.fileAction = vm.resolve.config.fileAction;
      var nameInternal = fileBrowserFactory.attributesNameKey.Name;
      vm.nodeName = vm.resolve.config.nodeObj[nameInternal];
    };
  }
})();
