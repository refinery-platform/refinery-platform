'use strict';

function rpUiGridRowTemplate ($window) {
  return {
    restrict: 'E',
    templateUrl: function () {
      return $window.getStaticUrl('partials/file-browser/partials/ui-grid-row-template.html');
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpUiGridRowTemplate', ['$window', rpUiGridRowTemplate]
);
