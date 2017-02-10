(function () {
  'use strict';
  angular.module('refineryTools').component('rpSingleInputGroupNav', {
    controller: 'SingleInputGroupNavCtrl',
    require: {
      displayCtrl: '^rpToolDisplay'
    },
    templateUrl: '/static/partials/tools/partials/single-input-group-nav-ctrl.html'
  });
})();
