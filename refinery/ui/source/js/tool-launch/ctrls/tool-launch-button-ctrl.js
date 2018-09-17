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
    'authService',
    '$timeout',
    'dataSetPropsService',
    'toolLaunchService',
    'toolLaunchStatusService',
    'toolSelectService',
    '$uibModal',
    'visualizationService',
    '$rootScope',
    '$window'
  ];

  function ToolLaunchButtonCtrl (
    $log,
    authService,
    $timeout,
    dataSetPropsService,
    toolLaunchService,
    toolLaunchStatusService,
    toolSelectService,
    $uibModal,
    visualizationService,
    $rootScope,
    $window
  ) {
    var vm = this;
    vm.launchTool = launchTool;
    vm.needMoreNodes = needMoreNodes;

    authService.isAuthenticated().then(
      function (isAuthenticated) {
        vm.userIsAnonymous = !isAuthenticated;
      }
    );

    /*
   * -----------------------------------------------------------------------------
   * Methods Definitions
   * -----------------------------------------------------------------------------
   */
    /**
     * @name launchTool
     * @desc  VM methods associated with button to launch a tool by sending
     * configs to the tool launch api
     * @memberOf refineryToolLaunch.ToolLaunchButtonCtrl
    **/
    function launchTool () {
      toolLaunchService.postToolLaunch().then(function (response) {
        dataSetPropsService.refreshDataSet();
        if (response.tool_definition.tool_type === 'VISUALIZATION') {
          visualizationService.getVisualizations($window.dataSetUuid);
        } else {
          $rootScope.$broadcast('rf/launchAnalysis');
        }
        toolLaunchStatusService.addToolLaunchStatus(response, 'success');
      }, function (error) {
        toolLaunchStatusService.addToolLaunchStatus(error, 'fail');
        $log.error(error);
      });
    }

   /**
     * @name needMoreNodes
     * @desc View method uses a service to check if the group has minimum nodes
     * @memberOf refineryToolLaunch.ToolLaunchButtonCtrl
    **/
    function needMoreNodes () {
      return toolLaunchService.checkNeedMoreNodes();
    }
  }
})();
