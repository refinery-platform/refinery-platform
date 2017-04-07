(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .directive('rpInputGroupCart', ['$window', rpInputGroupCart]);

  function rpInputGroupCart ($window) {
    return {
      restrict: 'E',
      scope: {
        collection: '='
      },
      templateUrl: function () {
        return $window.getStaticUrl('partials/tool-launch/partials/input-group-cart.html');
      }
    };
  }
})();
