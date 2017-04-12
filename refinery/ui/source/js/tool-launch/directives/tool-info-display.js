(function () {
  'use strict';
  angular.module('refineryToolLaunch').component('rpToolInfoDisplay', {
    controller: 'ToolInfoDisplayCtrl',
    require: {
      displayCtrl: '^rpToolDisplay'
    },
    templateUrl: ['$window', function ($window) {
      return $window.getStaticUrl('partials/tool-launch/partials/tool-info-display.html');
    }]
  });
})();
