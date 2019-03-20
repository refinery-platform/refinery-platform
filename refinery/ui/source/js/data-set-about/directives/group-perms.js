/**
 * DataSet Group Perms Component
 * @namespace rpDataSetGroupPerms
 * @desc Component for display a list of group perms based on a data set
 * @memberOf refineryApp.refineryDataSetAbout
 */
(function () {
  'use strict';

  angular
  .module('refineryDataSetAbout')
  .directive('rpDataSetGroupPerms', rpDataSetGroupPerms);

  rpDataSetGroupPerms.$inject = ['$window'];

  function rpDataSetGroupPerms ($window) {
    return {
      restrict: 'E',
      templateUrl: function () {
        return $window.getStaticUrl('partials/data-set-about/partials/group-perms.html');
      },
      controller: 'GroupPermsCtrl',
      controllerAs: 'GPCtrl',
      bindToController: {
        dataSetSharing: '@',
        ownerName: '@',
        groupList: '@'
      }
    };
  }
})();
