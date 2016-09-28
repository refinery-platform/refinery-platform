'use strict';

function rpIGVLaunchModalDetail () {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/igv/partials/modal-detail.html'
  };
}

angular
  .module('refineryIGV')
  .directive('rpIGVLaunchModalDetail', [
    rpIGVLaunchModalDetail
  ]);
