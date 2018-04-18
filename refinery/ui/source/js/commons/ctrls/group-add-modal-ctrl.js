/**
 * Group Add Modal Ctrl
 * @namespace Group Add Modal Ctrl
 * @desc Main controller for the group edit modal
 * @memberOf refineryApp
 */
(function () {
  'use strict';

  angular
    .module('refineryApp')
    .controller('GroupAddModalCtrl', GroupAddModalCtrl);

  GroupAddModalCtrl.$inject = [
    '$log',
    '$timeout',
    'groupDataService',
    'groupExtendedService'
  ];

  function GroupAddModalCtrl (
    $log,
    $timeout,
    groupDataService,
    groupExtendedService
  ) {
    var vm = this;

    vm.alertType = 'info';
    vm.cancel = cancel;
    vm.close = close;
    vm.createGroup = createGroup;
    vm.responseMessage = '';

    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */
    /**
     * @name cancel
     * @desc  UI helper methods to cancel and close modal instance
     * @memberOf refineryApp.GroupAddModalCtrl
    **/
    function cancel () {
      vm.modalInstance.dismiss('cancel');
    }

     /**
     * @name close
     * @desc  View method to close modals
     * @memberOf refineryApp.GroupAddModalCtrl
    **/
    function close () {
      vm.modalInstance.close(vm.alertType);
    }

     /**
     * @name createGroup
     * @desc  Method which creates a new group
     * @memberOf refineryApp.GroupAddModalCtrl
    **/
    function createGroup () {
      groupExtendedService.create({ name: vm.groupName }).$promise
        .then(function () {
          generateAlertMessage('success', vm.groupName);
          groupDataService.update();
          // Automatically dismisses modal
          $timeout(function () {
            vm.modalInstance.close(vm.alertType);
          }, 1500);
        }, function (error) {
          generateAlertMessage('danger', vm.groupName);
          $log.error(error);
        });
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
  }
})();
