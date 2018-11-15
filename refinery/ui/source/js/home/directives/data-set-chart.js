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
                backgroundColor: ['#3e95cd', '#8e5ea2', '#3cba9f', '#e8c3b9', '#c45850'],
                data: []
              }
            ],
            borderColor: [
              'rgba(255,99,132,1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)'
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
