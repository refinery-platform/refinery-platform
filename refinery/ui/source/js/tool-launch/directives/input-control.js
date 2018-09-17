(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .component('rpInputControl', {
      controller: 'InputControlCtrl',
      require: {
        displayCtrl: '^rpToolDisplay'
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/input-control.html');
      }]
    });
})();
