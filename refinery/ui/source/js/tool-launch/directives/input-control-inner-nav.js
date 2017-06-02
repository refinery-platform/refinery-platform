(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .component('rpInputControlInnerNav', {
      controller: 'InputControlInnerNavCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/input-control-inner-nav.html');
      }]
    });
})();
