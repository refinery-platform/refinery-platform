(function () {
  'use strict';
  angular.module('refineryToolLaunch').component('rpInputGroupNav', {
    controller: 'InputGroupNavCtrl',
    require: {
      displayCtrl: '^rpToolDisplay'
    },
    templateUrl: '/static/partials/tool-launch/partials/input-group-nav.html'
  });
})();
