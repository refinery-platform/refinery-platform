'use strict';

function statisticsData () {
  return {
    templateUrl: '/static/partials/statistics/template.html',
    restrict: 'A'
  };
}

angular
  .module('refineryStatistics')
  .directive('statisticsData', [statisticsData]);
