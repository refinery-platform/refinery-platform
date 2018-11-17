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
      link: function (scope, attr, elem, ctrl) {
        // initialize the chart
        var domChart = angular.element('#bar-chart')[0];
        // eslint-disable-next-line no-undef
        scope.homeChart = new Chart(domChart.getContext('2d'), {
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
            scales: {
              yAxes: [{
                ticks: {
                  beginAtZero: true
                },
                scaleLabel: {
                  display: true,
                  labelString: 'Number of Files'
                }
              }]
            }
          }
        });

        domChart.onclick = function (e) {
          var activePoint = scope.homeChart.getElementAtEvent(e);
          // TODO: after move to home, can use $location
          $window.location.href = '/files/#?' + ctrl.selectedAttribute.select.solr_name +
            '=' + activePoint[0]._model.label.join(' ');
        };
      }
    };
  }
})();
