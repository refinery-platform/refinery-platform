'use strict';

function rpDataSetAboutDetails () {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/data-set-about/views/details.html',
  };
}

angular
  .module('refineryDataSetAbout')
  .directive('rpDataSetAboutDetails', [
    rpDataSetAboutDetails
  ]
);
