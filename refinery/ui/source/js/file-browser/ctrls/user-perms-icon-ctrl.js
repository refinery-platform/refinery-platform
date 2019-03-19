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
    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return dataSetPropsService.dataSet;
        },
        function (dataSet) {
          console.log(dataSet);
          console.log('hummm');
          if (_.isEmpty(dataSet)) {
            vm.userPerms = 'none';
          } else if (dataSet.user_perms.change) {
            vm.userPerms = 'change';
          } else if (dataSet.user_perms.read) {
            vm.userPerms = 'read';
          } else if (dataSet.user_perms.read_meta) {
            vm.userPerms = 'read_meta';
          } else {
            vm.userPerms = 'none';
          }
        }
      );
    };
  }
})();
