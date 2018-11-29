/**
 * Tool List Ctrl
 * @namespace ToolListCtrl
 * @desc Component controller for the tool list partial.
 * @memberOf refineryApp.refineryHome
 */
(function () {
  'use strict';
  angular
    .module('refineryHome')
    .controller('ToolListCtrl', ToolListCtrl);

  ToolListCtrl.$inject = ['toolListService'];

  function ToolListCtrl (toolListService) {
    var vm = this;
    vm.toolList = toolListService.toolList;

    activate();
    /*
     * -----------------------------------------------------------------------------
     * Methods
     * -----------------------------------------------------------------------------
    */
    function activate () {
      // tool list won't be updated often, so no need for api call
      // if list is already populated
      if (!vm.toolList.length) {
        toolListService.getTools().then(function () {
          vm.toolList = toolListService.toolList;
        });
      }
    }
  }
})();
