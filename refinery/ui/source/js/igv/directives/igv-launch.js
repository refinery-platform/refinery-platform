'use strict';

function rpIGVLaunch () {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/igv/partials/igv-launch.html',
  };
}

angular
  .module('refineryIGV')
  .directive('rpIGVLaunch', [
    rpIGVLaunch
  ]
);
