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

  function toolLaunchStatusService () {
   // var toolLaunches = {}; // objects tracked by tools uuid
    var toolLaunches = [];


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
        toolLaunches.unshift({
          uuid: toolLaunch.uuid,
          type: toolLaunch.tool_definition.tool_type.toLowerCase(),
          name: toolLaunch.name,
          container_url: toolLaunch.container_url,
          status: toolStatus,
        });
      } else {
        toolLaunches.unshift({
          uuid: toolLaunch.config.data.tool_definition_uuid,
          msg: 'Tool launch failed.',
          status: toolStatus,
          apiStatus: toolLaunch.status,
          apiStatusMsg: toolLaunch.statusText,
        });
      }
    }

     /**
     * @name deleteToolLaunchStatus
     * @desc Removes tool launch from the list
     * @memberOf refineryToolLaunch.toolLaunchStatusService
     * @param {str} toolLaunchUuid - uuid for tool launch
    **/
    function deleteToolLaunchStatus (toolLaunchUuid) {
      for (var i = 0; i < toolLaunches.length; i++) {
        if (toolLaunches[i].uuid === toolLaunchUuid) {
          toolLaunches.splice(i, 1);
          break;
        }
      }
    }
  }
})();
