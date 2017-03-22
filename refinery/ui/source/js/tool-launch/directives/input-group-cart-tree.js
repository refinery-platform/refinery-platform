(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .directive('rpInputGroupCartTree', rpInputGroupCartTree);

  function rpInputGroupCartTree () {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        member: '='
      },
      templateUrl: '/static/partials/tool-launch/partials/input-group-cart-tree.html'
    };
  }
})();
