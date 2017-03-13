(function () {
  'use strict';
  angular.module('refineryToolLaunch').directive('inputGroupCart', function () {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        collection: '='
      },
      template: '<ul><input-group-cart-tree ng-repeat="member in ' +
      'collection.file_relationship" member="member"></input-group-cart-tree></ul>'
    };
  });
})();
