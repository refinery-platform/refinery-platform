'use strict';

function rpFileBrowserSelectionReset ($window) {
  return {
    restrict: 'AE',
    templateUrl: function () {
      return $window.getStaticUrl('partials/file-browser/partials/selection-reset.html');
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserSelectionReset', [
    '$window',
    rpFileBrowserSelectionReset
  ]
);
