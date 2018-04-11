/**
 * Events Card Ctrl
 * @namespace EventsCardCtrl
 * @desc Controller for events card component on dashboard component.
 * @memberOf refineryApp.refineryEventsCardCtrl
 */
(function () {
  'use strict';

  angular
    .module('refineryDashboard')
    .controller('CollaborationCardCtrl', CollaborationCardCtrl);

  CollaborationCardCtrl.$inject = ['$uibModal', 'groupMemberService'];

  function CollaborationCardCtrl (
    $uibModal,
    groupMemberService
  ) {
    var vm = this;
    vm.userGroups = [];
    vm.openGroupEditor = openGroupEditor;
    activate();

    function activate () {
      getGroups();
    }

    // list of groups a user is a member of
    function getGroups () {
      groupMemberService.query().$promise.then(function (response) {
        vm.userGroups = response.objects;
        console.log(vm.userGroups);
      });
    }

    function openGroupEditor (group) {
      $uibModal.open({
        component: 'rpGroupEditModal',
        resolve: {
          config: function () {
            return {
              group: group
            };
          }
        }
      });
    }

    /*
    * ---------------------------------------------------------
    * Watchers
    * ---------------------------------------------------------
    */
  }
})();
