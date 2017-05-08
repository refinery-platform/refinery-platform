(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolLaunchButtonCtrl', ToolLaunchButtonCtrl);

  ToolLaunchButtonCtrl.$inject = ['toolLaunchService'];

  function ToolLaunchButtonCtrl (toolLaunchService) {
    var vm = this;
    vm.launchTool = launchTool;
    vm.tool = {};

    /*
   * -----------------------------------------------------------------------------
   * Methods Definitions
   * -----------------------------------------------------------------------------
   */

    function launchTool () {
      toolLaunchService.generateLaunchConfig();
    }
  }
})();
