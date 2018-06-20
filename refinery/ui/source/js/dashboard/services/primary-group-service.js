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
     * @desc  Deep copy of tool
     * @memberOf refineryToolLaunch.toolSelectService
     * @param {obj} tool - api response tool
    **/
    function setPrimaryGroup (group) {
      var userProfile = userProfileV2Service.patch({
        primary_group: group.id
      }).$promise.then(function (response) {
        console.log(response);
      });
      return userProfile.$promise;
    }
  }
})();
