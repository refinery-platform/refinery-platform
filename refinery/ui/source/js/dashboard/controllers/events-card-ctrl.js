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
    .controller('EventsCardCtrl', EventsCardCtrl);

  EventsCardCtrl.$inject = ['toolsService'];

  function EventsCardCtrl (
    toolsService
  ) {
    var vm = this;
    vm.tools = [];
    activate();

    function activate () {
      getUserTools();
    }

    function getUserTools () {
      var toolRequest = toolsService.query();
      toolRequest.$promise.then(function (response) {
        console.log('get User tools');
        console.log(response);
        vm.tools = response;
       // angular.copy(addHumanTime(response), visualizations);
      });
    }

    /*
    * ---------------------------------------------------------
    * Watchers
    * ---------------------------------------------------------
    */
  }
})();
