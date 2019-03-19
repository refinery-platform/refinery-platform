/**
 * User Perms Icon Ctrl
 * @namespace userPermsIconCtrl
 * @desc Component controller for the files tab permission icon. Currently
 * expecting the file browser to update ownership and perms.
 * @memberOf refineryApp.refineryFileBrowser
 */
(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('UserPermsIconCtrl', UserPermsIconCtrl);

  UserPermsIconCtrl.$inject = [
    '_',
    '$scope',
    '$window',
    'dataSetPropsService'
  ];


  function UserPermsIconCtrl (
    _,
    $scope,
    $window,
    dataSetPropsService
  ) {
    var vm = this;
    vm.userPerms = 'none';
   /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    // Gets the data set properties
    function refreshDataSetProps () {
      dataSetPropsService.refreshDataSet().then(function () {
        vm.userPerms = dataSetPropsService.userPerms;
      });
    }

    vm.$onInit = function () {
      refreshDataSetProps();
    };
  }
})();
