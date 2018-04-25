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
    'toolLaunchService',
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
    toolLaunchService,
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
        $window.open(response.tool_url);
        if (response.tool_url.indexOf('/visualizations/') > -1) {
          visualizationService.getVisualizations($window.dataSetUuid);
        } else {
          $rootScope.$broadcast('rf/launchAnalysis');
        }
      }, function (error) {
        $uibModal.open({
          component: 'rpApiResponseModal',
          resolve: {
            modalData: function () {
              return {
                apiStatus: error.status,
                apiMsg: error.data,
                msgType: 'danger',
                introMsg: 'Unable to launch tool.',
                header: 'Error with Tool Launch'
              };
            }
          }
        });
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
