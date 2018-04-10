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

  CollaborationCardCtrl.$inject = ['groupMemberService'];

  function CollaborationCardCtrl (
    groupMemberService
  ) {
    var vm = this;
    vm.userGroups = [];
    activate();

    function activate () {
      console.log('CollaborationCardCtrl-card');
      getGroups();
    }

    // list of groups a user is a member of
    function getGroups () {
      groupMemberService.query().$promise.then(function (response) {
        vm.userGroups = response.objects;
        console.log(vm.userGroups);
      });
    }

    /*
    * ---------------------------------------------------------
    * Watchers
    * ---------------------------------------------------------
    */
  }
})();
