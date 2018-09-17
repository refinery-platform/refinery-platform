'use strict';

function rpDataSetAboutDetails ($window) {
  return {
    restrict: 'E',
    templateUrl: function () {
      return $window.getStaticUrl('partials/data-set-about/partials/details.html');
    }
  };
}

angular
  .module('refineryDataSetAbout')
  .directive('rpDataSetAboutDetails', [
    '$window',
    rpDataSetAboutDetails
  ]
);
