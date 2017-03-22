(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .directive('rpInputGroupCart', rpInputGroupCart);

  function rpInputGroupCart () {
    return {
      restrict: 'E',
      scope: {
        collection: '='
      },
      templateUrl: '/static/partials/tool-launch/partials/input-group-cart.html'
    };
  }
})();
