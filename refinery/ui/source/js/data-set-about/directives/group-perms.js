'use strict';

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

angular
  .module('refineryDataSetAbout')
  .directive('rpDataSetGroupPerms', [
    '$window',
    rpDataSetGroupPerms
  ]
);
