'use strict';

function rpIGVLaunchModalDetail () {
  return {
    restrict: 'AE',
    controller: 'IGVCtrl',
    controllerAs: 'ICtrl',
    templateUrl: '/static/partials/igv/partials/modal-detail.html'
  };
}

angular
  .module('refineryIGV')
  .directive('rpIGVLaunchModalDetail', [
    rpIGVLaunchModalDetail
  ]);
