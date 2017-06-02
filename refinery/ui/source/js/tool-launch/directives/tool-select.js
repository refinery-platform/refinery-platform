(function () {
  'use strict';
  angular.module('refineryToolLaunch').component('rpToolSelect', {
    templateUrl: ['$window', function ($window) {
      return $window.getStaticUrl('partials/tool-launch/partials/tool-select.html');
    }],
    controller: 'ToolSelectCtrl'
  });
})();
