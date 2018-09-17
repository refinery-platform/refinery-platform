(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .directive('rpFileBrowserSelectionReset', rpFileBrowserSelectionReset);

  rpFileBrowserSelectionReset.$inject = ['$window'];

  function rpFileBrowserSelectionReset ($window) {
    return {
      restrict: 'AE',
      templateUrl: function () {
        return $window.getStaticUrl('partials/file-browser/partials/selection-reset.html');
      }
    };
  }
})();
