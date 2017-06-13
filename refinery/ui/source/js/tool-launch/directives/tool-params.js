(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .component('rpToolParams', {
      controller: 'ToolParamsCtrl',
      require: {
        displayCtrl: '^rpToolDisplay'
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/tool-params.html');
      }]
    });
})();
