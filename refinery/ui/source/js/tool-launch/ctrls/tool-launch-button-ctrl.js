/**
 * Tool Launch Button Ctrl
 * @namespace ToolLaunchButtonCtrl
 * @desc Controller for component, rpToolLaunchButton.
 * @memberOf refineryApp.refineryToolLaunch
 */
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
    vm.needMoreNodes = needMoreNodes;

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


    // View method to check if the group has minimum nodes
    function needMoreNodes () {
      return toolLaunchService.checkNeedMoreNodes();
    }
  }
})();
