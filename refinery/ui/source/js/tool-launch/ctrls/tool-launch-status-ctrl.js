/**
 * Tool Launch Status Ctrl
 * @namespace ToolParamsCtrl
 * @desc Ctrl for rpToolParams directive, which is the parameter's panel.
 * Include collapsing, displaying parameters, and form for parameters.
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolLaunchStatusCtrl', ToolLaunchStatusCtrl);

  ToolLaunchStatusCtrl.$inject = [
    '$scope',
    'toolLaunchStatusService'
  ];


  function ToolLaunchStatusCtrl (
    $scope,
    toolLaunchStatusService
  ) {
    var vm = this;
    vm.removeToolLaunch = removeToolLaunch;
    vm.toolLaunches = toolLaunchStatusService.toolLaunches;

    function removeToolLaunch (toolLaunchUuid) {
      toolLaunchStatusService.deleteToolLaunchStatus(toolLaunchUuid);
    }

    /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */

    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return toolLaunchStatusService.toolLaunches;
        },
        function () {
          vm.toolLaunches = toolLaunchStatusService.toolLaunches;
        }
      );
    };
  }
})();
