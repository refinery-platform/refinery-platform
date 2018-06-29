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
    'fileBrowserFactory',
    'settings'
  ];

  function DataFileEditModalCtrl (
    $log,
    fileBrowserFactory,
    settings
  ) {
    var vm = this;

    vm.alertType = 'info';
    vm.close = close;
    vm.isLoading = false;
    vm.removeFile = removeFile;
    vm.useS3 = settings.djangoApp.deploymentPlatform === 'aws';

    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */
    /**

    /**
     /**
     * @name close
     * @desc  View method to close modals
     * @memberOf refineryApp.GroupAddModalCtrl
    **/
    function close () {
      vm.modalInstance.close('success');
    }

     /**
     * @name removeFile
     * @desc  View method to remove file via service
     * @memberOf refineryApp.removeFile
    **/
    function removeFile () {
      vm.isLoading = true;
    }

      /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      vm.fileAction = vm.resolve.config.fileAction;
      var nameInternal = fileBrowserFactory.attributesNameKey.Name;
      vm.nodeURL = vm.resolve.config.nodeObj.REFINERY_DOWNLOAD_URL_s;
      vm.nodeName = vm.resolve.config.nodeObj[nameInternal];
    };
  }
})();
