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
    'toolLaunchService',
    'toolSelectService',
    '$uibModal',
    '$rootScope'
   // '$window'
  ];

  function ToolLaunchButtonCtrl (
    $log,
    $timeout,
    toolLaunchService,
    toolSelectService,

    $uibModal,
    $rootScope
   // $window
  ) {
    var vm = this;
    vm.launchTool = launchTool;
    vm.needMoreNodes = needMoreNodes;

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
      $rootScope.$broadcast('rf/launchAnalysis');
      toolLaunchService.postToolLaunch().then(function (response) {
       // $window.location.href = response.tool_url;
        console.log(response);
        $uibModal.open({
          component: 'aPIResponseModal',
          resolve: {
            modalData: function () {
              return {
                apiStatus: '200',
                apiMsg: 'API says something here.',
                introMsg: 'Some general info you need to know about,' +
                ' requiring a modal.',
                header: 'General Info'
              };
            }
          }
        });
      }, function (error) {
        $uibModal.open({
          component: 'aPIResponseModal',
          resolve: {
            modalData: function () {
              return {
                apiStatus: error.status,
                apiMsg: error.data,
                msgType: 'danger',
                introMsg: 'Unable to launch tool, please try again.',
                header: 'Warning'
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
