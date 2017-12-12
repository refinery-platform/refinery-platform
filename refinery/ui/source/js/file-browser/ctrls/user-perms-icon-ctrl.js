/**
 * User Perms Icon
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
    dataSetPermsService,
    isOwnerService
  ) {
    var ownerService = isOwnerService;
    var permsService = dataSetPermsService;
    var vm = this;
    vm.isOwner = ownerService.isOwner;
    vm.userPerms = permsService.userPerms;
    console.log('in the user perms ctrl');
   /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    // isOwnerService called by main file browser ctrl
    vm.$onInit = function () {
      console.log('in on init');
      permsService.refreshDataSetPerms($window.dataSetUuid).then(function (response) {
        vm.userPerms = response.user_perms;
        console.log('in the init');
        console.log(vm.userPerms);
      });

      $scope.$watchCollection(
        function () {
          return ownerService.isOwner;
        },
        function () {
          vm.isOwner = ownerService.isOwner;
          console.log('isOwner');
          console.log(vm.isOwner);
        }
      );
    };
    $scope.$watchCollection(
      function () {
        return permsService.userPerms;
      },
      function () {
        vm.userPerms = permsService.userPerms;
        console.log('userPerms');
        console.log(vm.userPerms);
      }
    );
  }
})();
