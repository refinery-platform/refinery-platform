(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .component('rpInputControlGroups', {
      restrict: 'E',
      controller: 'InputControlGroupsCtrl',
      require: {
        inputCtrl: '^rpInputControl'
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/input-control-groups.html');
      }]
    });
})();
