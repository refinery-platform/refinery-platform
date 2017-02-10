(function () {
  'use strict';
  angular.module('refineryTools').component('rpSingleInputWorkflowNav', {
    controller: 'SingleInputWorkflowNavCtrl',
    require: {
      displayCtrl: '^rpToolDisplay'
    },
    templateUrl: '/static/partials/tools/partials/single-input-workflow-nav-ctrl.html'
  });
})();
