'use strict';

function rpDataSetAboutDetails () {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/data-set-about/partials/details.html',
    controller: 'AboutDetailsCtrl',
    controllerAs: 'ADCtrl',
    bindToController: {
      dataSet: '@',
      studies: '@',
      assays: '@',
    }
  };
}

angular
  .module('refineryDataSetAbout')
  .directive('rpDataSetAboutDetails', [
    rpDataSetAboutDetails
  ]
);
