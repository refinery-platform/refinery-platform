(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .directive('rpInputControlNavTree', rpInputControlNavTree);

  rpInputControlNavTree.$inject = ['$window'];

  function rpInputControlNavTree ($window) {
    return {
      restrict: 'E',
      controller: 'InputControlNavTreeCtrl',
      controllerAs: 'treeCtrl',
      scope: {
        member: '=',
        depth: '='
      },
      templateUrl: function () {
        return $window.getStaticUrl('partials/tool-launch/partials/input-control-nav-tree.html');
      }
    };
  }
})();
