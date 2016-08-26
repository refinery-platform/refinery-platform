'use strict';

function rpDataSetAboutSharing () {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/data-set-about/partials/sharing.html',
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
    rpDataSetAboutSharing
  ]
);
