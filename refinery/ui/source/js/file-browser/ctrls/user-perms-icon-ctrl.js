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
    '$scope',
    '$window',
    'dataSetPermsService',
    'isOwnerService'
  ];


  function UserPermsIconCtrl (
    $scope,
    $window,
    dataSetPermsService
  ) {
    var permsService = dataSetPermsService;
    var vm = this;
    vm.userPerms = 'none';
   /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      permsService.getDataSetSharing($window.dataSetUuid).then(function (response) {
        vm.userPerms = response.user_perms;
      });

      $scope.$watch(
        function () {
          return permsService.userPerms;
        },
        function () {
          vm.userPerms = permsService.userPerms;
        }
      );
    };
  }
})();
