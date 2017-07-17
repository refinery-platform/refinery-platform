(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .filter('groupTypeIcon', function () {
      return function (param) {
        switch (param) {
          case 'LIST':
            return 'fa fa-list';
          default: // Pair
            return 'fa fa-link';
        }
      };
    });
})();
