(function () {
  'use strict';
  angular
  .module('refineryFileBrowser')
  .directive('rpUiGridRowTemplate', rpUiGridRowTemplate);

  rpUiGridRowTemplate.$inject = ['$window'];

  function rpUiGridRowTemplate ($window) {
    return {
      restrict: 'E',
      templateUrl: function () {
        return $window.getStaticUrl('partials/file-browser/partials/ui-grid-row-template.html');
      }
    };
  }
})();
