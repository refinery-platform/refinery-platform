(function () {
  'use strict';
  angular.module('refineryToolLaunch').component('rpInputControl', {
    controller: 'InputControlCtrl',
    require: {
      displayCtrl: '^rpToolDisplay'
    },
    templateUrl: '/static/partials/tool-launch/partials/input-control.html'
  });
})();
