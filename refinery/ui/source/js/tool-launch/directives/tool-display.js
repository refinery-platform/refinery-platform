(function () {
  'use strict';
  angular.module('refineryToolLaunch').component('rpToolDisplay', {
    controller: 'ToolDisplayCtrl',
    templateUrl: ['$window', function ($window) {
      return $window.getStaticUrl('partials/tool-launch/partials/tool-display.html');
    }]
  });
})();
