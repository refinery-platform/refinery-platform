(function () {
  'use strict';
  angular.module('refineryToolLaunch').directive('inputGroupCart', function () {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        collection: '='
      },
      templateUrl: '/static/partials/tool-launch/partials/input-group-cart.html'
    };
  });
})();
