/**
 * Tool Launch Status Ctrl
 * @namespace ToolLaunchStatusCtrl
 * @desc Ctrl for rpToolLaunchStatus component.
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

    /**
     * @name removeToolLaunch
     * @desc  VM methods to remove the tool launch status from the list
     * @memberOf refineryToolLaunch.ToolLaunchStatusCtrl
    **/
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
