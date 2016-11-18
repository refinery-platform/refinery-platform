'use strict';

function rpFileBrowserSelectionReset () {
  return {
    restrict: 'AE',
    templateUrl: '/static/partials/file-browser/partials/selection-reset.html'
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserSelectionReset', [
    rpFileBrowserSelectionReset
  ]
);
