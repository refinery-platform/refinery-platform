(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .directive('inputGroupCartTree', inputGroupCartTree);

  function inputGroupCartTree () {
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
