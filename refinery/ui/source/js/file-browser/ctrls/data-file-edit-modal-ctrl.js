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
    '$scope',
    'fileBrowserFactory',
    'fileUploadStatusService',
    'nodesV2Service',
    'settings'
  ];

  function DataFileEditModalCtrl (
    $log,
    $scope,
    fileBrowserFactory,
    fileUploadStatusService,
    nodesV2Service,
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
      nodesV2Service.partial_update({
        uuid: vm.resolve.config.nodeObj.uuid,
        file_uuid: ''
      }).$promise.then(function () {
        vm.isLoading = false;
        vm.alertType = 'success';
        vm.responseMessage = 'File successfully deleted.';
      }, function () {
        vm.isLoading = false;
        vm.alertType = 'danger';
        vm.responseMessage = 'Error deleted file.';
      });
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
      vm.nodeUuid = vm.resolve.config.nodeObj.uuid;

      $scope.$watch(
        function () {
          return fileUploadStatusService.fileUploadStatus;
        },
        function (fileStatus) {
          vm.fileStatus = fileStatus;
        }
      );
    };
  }
})();
