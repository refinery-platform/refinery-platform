(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolParamsCtrl', ToolParamsCtrl);

  ToolParamsCtrl.$inject = [
    '$scope',
    'toolParamsService'
  ];


  function ToolParamsCtrl (
    $scope,
    toolParamsService
  ) {
    var paramsService = toolParamsService;
    var vm = this;
    vm.isToolParamsCollapsed = false;
    vm.params = paramsService.toolParams;
   /*
   * ---------------------------------------------------------
   * Methods Definitions
   * ---------------------------------------------------------
   */

    /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */

    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return vm.displayCtrl.selectedTool;
        },
        function () {
          vm.params = paramsService.toolParams;
        }
      );
    };
  }
})();
