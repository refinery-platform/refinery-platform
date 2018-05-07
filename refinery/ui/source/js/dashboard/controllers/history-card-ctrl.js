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
    vm.isToolsLoading = true;
    vm.getUserTools = getUserTools;
    vm.tools = [];
    activate();

    function activate () {
      getUserTools();
    }

    /**
     * @name getUserTools
     * @desc  View method to get the tools list
     * @memberOf refineryDashboard.HistoryCardCtrl
    **/
    function getUserTools () {
      var toolRequest = toolsService.query();
      toolRequest.$promise.then(function (response) {
        vm.isToolsLoading = false;
        vm.tools = response;
      });
    }

    /*
    * ---------------------------------------------------------
    * Watchers
    * ---------------------------------------------------------
    */
  }
})();
