(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .directive('rpInputGroupCartTree', ['$window', rpInputGroupCartTree]);

  function rpInputGroupCartTree ($window) {
    return {
      restrict: 'E',
      scope: {
        member: '='
      },
      templateUrl: function () {
        return $window.getStaticUrl('partials/tool-launch/partials/input-group-cart-tree.html');
      }
    };
  }
})();
