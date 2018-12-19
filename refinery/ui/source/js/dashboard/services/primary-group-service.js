/**
 * Primary Group Service
 * @namespace primaryGroupService
 * @desc Service tracks the selected tool, grabs the tool definition
 * list from service, and tracks if the panels are collapsed
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';
  angular
    .module('refineryDashboard')
    .factory('primaryGroupService', primaryGroupService);

  primaryGroupService.$inject = ['currentUserService', 'userProfileV2Service'];

  function primaryGroupService (currentUserService, userProfileV2Service) {
    var service = {
      setPrimaryGroup: setPrimaryGroup
    };
    return service;

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */

    /**
     * @name setPrimaryGroup
     * @desc  Sets the primary group though api service and updates primaryGroup
     * @memberOf refineryDashboard.primaryGroupService
     * @param {obj} group - contains group name and id
    **/
    function setPrimaryGroup (group) {
      var userProfile = userProfileV2Service.partial_update({
        uuid: currentUserService.currentUser.profile.uuid,
        primary_group: group.id
      });
      return userProfile.$promise;
    }
  }
})();
