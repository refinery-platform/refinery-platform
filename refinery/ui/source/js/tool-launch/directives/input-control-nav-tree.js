(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .directive('rpInputControlNavTree', rpInputControlNavTree);

  function rpInputControlNavTree () {
    return {
      restrict: 'E',
      controller: 'InputControlNavTreeCtrl',
      controllerAs: 'treeCtrl',
      scope: {
        member: '=',
        depth: '='
      },
      templateUrl: '/static/partials/tool-launch/partials/input-control-nav-tree.html'
    };
  }
})();
