/**
 * Group Add Modal Ctrl
 * @namespace Group Add Modal Ctrl
 * @desc Main controller for the adding a new group modal
 * @memberOf refineryApp
 */
(function () {
  'use strict';

  angular
    .module('refineryApp')
    .controller('GroupAddModalCtrl', GroupAddModalCtrl);

  GroupAddModalCtrl.$inject = [
    '$log',
    'groupService'
  ];

  function GroupAddModalCtrl (
    $log,
    groupService
  ) {
    var vm = this;

    vm.alertType = 'info';
    vm.close = close;
    vm.createGroup = createGroup;
    vm.isLoading = false;
    vm.responseMessage = '';

    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */
    /**
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
      vm.isLoading = true;
      groupService.save({ name: vm.groupName }).$promise
        .then(function () {
          vm.isLoading = false;
          generateAlertMessage('success', vm.groupName);
        }, function (error) {
          vm.isLoading = false;
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
