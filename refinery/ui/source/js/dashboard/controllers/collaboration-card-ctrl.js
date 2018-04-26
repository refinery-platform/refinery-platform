/**
 * Collaboration Card Ctrl
 * @namespace CollaborationCardCtrl
 * @desc Controller for events card component on dashboard component.
 * @memberOf refineryApp.CollaborationCardCtrl
 */
(function () {
  'use strict';

  angular
    .module('refineryDashboard')
    .controller('CollaborationCardCtrl', CollaborationCardCtrl);

  CollaborationCardCtrl.$inject = [
    '$scope',
    '$uibModal'
  ];

  function CollaborationCardCtrl (
    $scope,
    $uibModal
  ) {
    var vm = this;
    vm.userGroups = [];
    vm.openGroupAdd = openGroupAdd;
    vm.openGroupEditor = openGroupEditor;
    vm.openGroupMemberAdd = openGroupMemberAdd;
    vm.openGroupMemberEditor = openGroupMemberEditor;

    activate();

    function activate () {

    }

    function openGroupAdd () {
      var modalInstance = $uibModal.open({
        component: 'rpGroupAddModal'
      });

      modalInstance.result.then(function (response) {
        if (response === 'success') {
          vm.dashboardParentCtrl.getGroups();
        }
      });
    }

    function openGroupEditor (group, member) {
      var modalInstance = $uibModal.open({
        component: 'rpGroupEditModal',
        resolve: {
          config: function () {
            return {
              group: group,
              activeMember: member
            };
          }
        }
      });

      modalInstance.result.then(function (response) {
        if (response === 'success') {
          vm.dashboardParentCtrl.getGroups();
        }
      });
    }

    function openGroupMemberEditor (member, totalMembers, group) {
      var modalInstance = $uibModal.open({
        component: 'rpGroupMemberEditModal',
        resolve: {
          config: function () {
            return {
              activeMember: member,
              activeGroup: group,
              totalMember: totalMembers
            };
          }
        }
      });
      modalInstance.result.then(function (response) {
        if (response === 'success') {
          vm.dashboardParentCtrl.getGroups();
        }
      });
    }

    function openGroupMemberAdd (group) {
      var modalInstance = $uibModal.open({
        component: 'rpGroupMemberAddModal',
        resolve: {
          config: function () {
            return {
              group: group
            };
          }
        }
      });
      modalInstance.result.then(function (response) {
        if (response === 'success') {
          vm.dashboardParentCtrl.getGroups();
        }
      });
    }
     /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return vm.dashboardParentCtrl.groups;
        },
        function () {
          vm.userGroups = vm.dashboardParentCtrl.groups;
        }
      );
    };
  }
})();
