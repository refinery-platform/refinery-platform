/**
 * Tool Launch Status Service
 * @namespace toolLaunchStatusService
 * @desc Service which tracks tools launched until user closes the msg.
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .factory('toolLaunchStatusService', toolLaunchStatusService);

  toolLaunchStatusService.$inject = ['_'];

  function toolLaunchStatusService (
    _
  ) {
   // var toolLaunches = {}; // objects tracked by tools uuid
    var toolLaunches = {
      x56fscg: { name: 'VisToolName', type: 'analysis', status: 'success', uuid: 's3kjslkjt' }
    };


    var service = {
      addToolLaunchStatus: addToolLaunchStatus,
      deleteToolLaunchStatus: deleteToolLaunchStatus,
      toolLaunches: toolLaunches
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
       /**
     * @name addToolLaunchStatus
     * @desc Adds tool launch to the list
     * @memberOf refineryToolLaunch.toolLaunchStatusService
     * @param {object} toolLaunch - custom tool launch object requires uuid,
     * tool type, name, and status
    **/
    function addToolLaunchStatus (toolLaunch) {
      angular.copy(toolLaunches[toolLaunch.uuid], toolLaunch);
    }

     /**
     * @name deleteToolLaunchStatus
     * @desc Removes tool launch from the list
     * @memberOf refineryToolLaunch.toolLaunchStatusService
     * @param {str} toolLaunchUuid - uuid for tool launch
    **/
    function deleteToolLaunchStatus (toolLaunchUuid) {
      if (_.has(toolLaunchUuid, toolLaunches)) {
        delete toolLaunches[toolLaunchUuid];
      }
    }
  }
})();
