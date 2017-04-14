(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .directive('rpInputControlNav', rpInputControlNav);

  rpInputControlNav.$inject = ['$window'];

  function rpInputControlNav ($window) {
    return {
      restrict: 'E',
      scope: {
        collection: '=',
        counter: '='
      },
      templateUrl: function () {
        return $window.getStaticUrl('partials/tool-launch/partials/input-control-nav.html');
      }
    };
  }
})();
