/**
 * Select All Checkbox
 * @namespace rpSelectAllCheckbox
 * @desc Component which displays a custom select-all checkbox with an
 * indeterminate state
 * @memberOf refineryApp.refineryFileBrowser
 */
(function () {
  'use strict';
  angular
    .module('refineryFileBrowser')
    .directive('rpSelectAllCheckbox', rpSelectAllCheckbox);

  rpSelectAllCheckbox.$inject = ['$window'];

  function rpSelectAllCheckbox ($window) {
    return {
      restrict: 'E',
      templateUrl: function () {
        return $window.getStaticUrl('partials/file-browser/partials/assay-filters.html');
      },
      controller: 'rpSelectAllCheckboxCtrl',
      controllerAs: '$ctrl',
      link: function (scope, element, attrs, ctrl) {
        console.log('In Select Checkbox');
        console.log(ctrl);
      }
    };
  }
})();
