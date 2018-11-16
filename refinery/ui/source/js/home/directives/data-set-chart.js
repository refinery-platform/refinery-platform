/**
 * Data Set Chart Directive
 * @namespace rpDataSetChart
 * @desc Data set chart directive.
 * @memberOf refineryApp.refineryHome
 */
(function () {
  'use strict';

  angular
    .module('refineryHome')
    .directive('rpDataSetChart', rpDataSetChart);

  rpDataSetChart.$inject = ['$window'];

  function rpDataSetChart ($window) {
    return {
      restrict: 'AE',
      controller: 'DataSetChartCtrl as $ctrl',
      templateUrl: function () {
        return $window.getStaticUrl('partials/home/partials/data-set-chart.html');
      },
      link: function (scope) {
        // TODO: MOVE THE CHART GENERATION TO A SERVICE VS POPLUTING THE SCOPE
        // initialize the chart
        var ctx = angular.element('#bar-chart')[0].getContext('2d');
        // eslint-disable-next-line no-undef
        scope.homeChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: [],
            datasets: [
              {
                label: 'File Type',
                backgroundColor: ['#56B4E9', '#CC79A7', '#009E73', '#D55E00', '#0072B2'],
                data: []
              }
            ],
            borderColor: [
              '#56B4E9', // sky-blue
              '#CC79A7', // reddish purple
              '#009E73', // blue-green
              '#D55E00', // red-orange
              '#0072B2', // blue
              '#F0E442'  // yellow

            ],
            borderWidth: 1
          },
          options: {
            legend: { display: false },
            title: {
              display: true,
              text: 'Files'
            },
            scales: {
              yAxes: [{
                ticks: {
                  beginAtZero: true
                }
              }]
            }
          }
        });
      }
    };
  }
})();
