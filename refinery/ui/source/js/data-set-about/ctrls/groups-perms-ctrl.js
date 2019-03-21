/**
 * Group Perms Ctrl
 * @namespace GroupPermsCtrl
 * @desc Controller for the group-perms component
 * @memberOf refineryApp.refineryDataSetAbout
 */
(function () {
  'use strict';

  angular
  .module('refineryDataSetAbout')
  .controller('GroupPermsCtrl', GroupPermsCtrl);

  GroupPermsCtrl.$inject = [
    'dataSetGroupPermsService',
    '$window',
    '$log'
  ];

  function GroupPermsCtrl (
    dataSetGroupPermsService,
    $window,
    $log
  ) {
    var vm = this;
    vm.groupList = dataSetGroupPermsService.groupList;

    /**
     * @name refreshDataSetGroups
     * @desc  Refresh the group list perms
     * @memberOf refineryDataSetAbout.refreshDataSetGroups
    **/
    vm.refreshDataSetGroups = function () {
      var dataSetUuid = $window.dataSetUuid;

      dataSetGroupPermsService.getDataSetGroupPerms(dataSetUuid)
        .then(function () {
          vm.groupList = dataSetGroupPermsService.groupList;
        }, function (error) {
          $log.error(error);
        });
    };
    vm.refreshDataSetGroups();
  }
})();
