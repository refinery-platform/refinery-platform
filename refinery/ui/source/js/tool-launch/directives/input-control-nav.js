(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .directive('rpInputControlNav', rpInputControlNav);

  function rpInputControlNav () {
    return {
      restrict: 'E',
      scope: {
        collection: '=',
        counter: '='
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/input-control-nav.html');
      }]
    };
  }
})();
