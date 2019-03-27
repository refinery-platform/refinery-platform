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
    '$timeout',
    'dataSetPropsService',
    'settings',
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
    $timeout,
    dataSetPropsService,
    settings,
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
    vm.userIsAnonymous = settings.djangoApp.userId !== undefined;

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
