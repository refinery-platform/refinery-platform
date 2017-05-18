(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolLaunchButtonCtrl', ToolLaunchButtonCtrl);

  ToolLaunchButtonCtrl.$inject = [
    '$log',
    'toolLaunchService',
    'toolSelectService',
    '$window'
  ];

  function ToolLaunchButtonCtrl (
    $log,
    toolLaunchService,
    toolSelectService,
    $window
  ) {
    var vm = this;
    vm.launchTool = launchTool;

    /*
   * -----------------------------------------------------------------------------
   * Methods Definitions
   * -----------------------------------------------------------------------------
   */

    function launchTool () {
      toolLaunchService.postToolLaunch().then(function (response) {
        if (toolSelectService.selectedTool.tool_type === 'VISUALIZATION') {
          $window.open(response.tool_url);
        }
      }, function (error) {
        $log.error(error);
      });
    }
  }
})();
