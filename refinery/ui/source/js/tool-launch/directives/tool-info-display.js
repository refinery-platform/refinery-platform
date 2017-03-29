(function () {
  'use strict';
  angular.module('refineryToolLaunch').component('rpToolInfoDisplay', {
    controller: 'ToolInfoDisplayCtrl',
    require: {
      displayCtrl: '^rpToolDisplay'
    },
    templateUrl: '/static/partials/tool-launch/partia/tool-info-display.html'
  });
})();
