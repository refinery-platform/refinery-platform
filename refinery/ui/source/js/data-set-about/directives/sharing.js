'use strict';

function rpDataSetAboutSharing ($window) {
  return {
    restrict: 'E',
    templateUrl: function () {
      return $window.getStaticUrl('partials/data-set-about/partials/sharing.html');
    },
    controller: 'AboutSharingCtrl',
    controllerAs: 'ASCtrl',
    bindToController: {
      dataSetSharing: '@',
      ownerName: '@',
      groupList: '@'
    }
  };
}

angular
  .module('refineryDataSetAbout')
  .directive('rpDataSetAboutSharing', [
    '$window',
    rpDataSetAboutSharing
  ]
);
