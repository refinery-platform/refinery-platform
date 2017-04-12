(function () {
  'use strict';
  angular.module('refineryToolLaunch').component('rpInputGroup', {
    controller: 'InputGroupCtrl',
    require: {
      displayCtrl: '^rpToolDisplay'
    },
    templateUrl: ['$window', function ($window) {
      return $window.getStaticUrl('partials/tool-launch/partials/input-group.html');
    }]
  });
})();
