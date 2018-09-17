'use strict';

function statisticsData ($window) {
  return {
    templateUrl: function () {
      return $window.getStaticUrl('partials/statistics/template.html');
    },
    restrict: 'A'
  };
}

angular
  .module('refineryStatistics')
  .directive('statisticsData', ['$window', statisticsData]);
