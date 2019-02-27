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

  primaryGroupService.$inject = ['settings', 'userProfileV2Service'];

  function primaryGroupService (settings, userProfileV2Service) {
    var primaryGroup = {
      name: settings.djangoApp.userprofilePrimaryGroup,
      id: settings.djangoApp.userprofilePrimaryGroupID
    };

    var service = {
      primaryGroup: primaryGroup,
      setPrimaryGroup: setPrimaryGroup,
      updatePrimaryGroup: updatePrimaryGroup
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
        uuid: settings.djangoApp.userprofileUUID,
        primary_group: group.id
      });
      userProfile.$promise.then(function () {
        primaryGroup.name = group.name;
        primaryGroup.id = group.id;
      });
      return userProfile.$promise;
    }

    /**
     * @name updatePrimaryGroup
     * @desc Updates the primary group, useful when deleting groups
     * @memberOf refineryDashboard.updatePrimaryGroup
    **/
    function updatePrimaryGroup () {
      primaryGroup.name = settings.djangoApp.userprofilePrimaryGroup;
      primaryGroup.id = settings.djangoApp.userprofilePrimaryGroupID;
    }
  }
})();
