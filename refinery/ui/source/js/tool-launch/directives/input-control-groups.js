(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .component('rpInputControlGroups', {
      restrict: 'E',
      controller: 'InputControlNavTreeCtrl',
      require: {
        inputCtrl: '^rpInputControl'
      },
      scope: {
        member: '=',
        depth: '='
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/input-control-nav-tree.html');
      }]
    });
})();
