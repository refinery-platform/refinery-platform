(function () {
  'use strict';
  angular.module('refineryTools').component('rpSingleInputGroup', {
    controller: 'SingleInputGroupCtrl',
    require: {
      displayCtrl: '^rpToolDisplay'
    },
    templateUrl: '/static/partials/tools/partials/single-input-group.html'
  });
})();
