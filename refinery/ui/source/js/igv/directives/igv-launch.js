'use strict';

function rpIGVLaunch () {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/igv/partials/igv-launch.html',
    controller: 'IGVCtrl',
    controllerAs: 'ICtrl',
    bindToController: {
      speciesList: '@'
    },

  };
}

angular
  .module('refineryIGV')
  .directive('rpIGVLaunch', [
    rpIGVLaunch
  ]
);
