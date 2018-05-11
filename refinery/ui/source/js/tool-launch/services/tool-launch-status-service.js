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
    var toolLaunches = {};


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
    function addToolLaunchStatus (toolLaunch, toolStatus) {
      if (toolStatus === 'success') {
        toolLaunches[toolLaunch.uuid] = {
          uuid: toolLaunch.uuid,
          type: toolLaunch.tool_definition.tool_type.toLowerCase(),
          name: toolLaunch.name,
          container_url: toolLaunch.container_url,
          status: toolStatus
        };
      } else {
        console.log(toolLaunch);
        toolLaunches[toolLaunch.config.data.tool_definition_uuid] = {
          uuid: toolLaunch.config.data.tool_definition_uuid,
          msg: 'Tool launch failed.',
          status: toolStatus,
          apiStatus: toolLaunch.status,
          apiStatusMsg: toolLaunch.statusText
        };
      }
    }

     /**
     * @name deleteToolLaunchStatus
     * @desc Removes tool launch from the list
     * @memberOf refineryToolLaunch.toolLaunchStatusService
     * @param {str} toolLaunchUuid - uuid for tool launch
    **/
    function deleteToolLaunchStatus (toolLaunchUuid) {
      if (_.has(toolLaunches, toolLaunchUuid)) {
        delete toolLaunches[toolLaunchUuid];
      }
    }
  }
})();
