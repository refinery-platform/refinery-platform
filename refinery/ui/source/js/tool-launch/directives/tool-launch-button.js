(function () {
  'use strict';
  angular.module('refineryToolLaunch').component('rpToolLaunchButton', {
    controller: 'ToolLaunchButtonCtrl',
    templateUrl: ['$window', function ($window) {
      return $window.getStaticUrl('partials/tool-launch/partials/tool-launch-button.html');
    }]
  });
})();
