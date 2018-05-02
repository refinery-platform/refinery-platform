/**
 * History Card Ctrl
 * @namespace HistoryCardCtrl
 * @desc Controller for history card component on dashboard component.
 * @memberOf refineryApp.refineryHistoryCardCtrl
 */
(function () {
  'use strict';

  angular
    .module('refineryDashboard')
    .controller('HistoryCardCtrl', HistoryCardCtrl);

  HistoryCardCtrl.$inject = ['toolsService'];

  function HistoryCardCtrl (
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
