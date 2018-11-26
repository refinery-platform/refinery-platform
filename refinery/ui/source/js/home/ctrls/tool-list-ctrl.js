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

    toolListService.getTools().then(function () {
      vm.toolList = toolListService.toolList;
    });
  }
})();
