(function () {
  'use strict';
  angular.module('refineryToolLaunch').component('rpInputGroup', {
    controller: 'InputGroupCtrl',
    require: {
      displayCtrl: '^rpToolDisplay'
    },
    templateUrl: '/static/partials/tool-launch/partials/input-group.html'
  });
})();
