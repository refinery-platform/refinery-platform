'use strict';

function rpIGVLaunchModalDetail ($window) {
  return {
    restrict: 'AE',
    templateUrl: function () {
      return $window.getStaticUrl('partials/igv/partials/modal-detail.html');
    }
  };
}

angular
  .module('refineryIGV')
  .directive('rpIGVLaunchModalDetail', [
    '$window',
    rpIGVLaunchModalDetail
  ]);
