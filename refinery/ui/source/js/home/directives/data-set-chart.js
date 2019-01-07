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

  rpDataSetChart.$inject = ['$timeout', '$window'];

  function rpDataSetChart ($timeout, $window) {
    return {
      restrict: 'AE',
      controller: 'DataSetChartCtrl as DSCtrl',
      templateUrl: function () {
        return $window.getStaticUrl('partials/home/partials/data-set-chart.html');
      },
      link: function (scope, elem, attr, ctrl) {
        // initialize the chart
        var domChart = elem.find('#files-bar-chart')[0];

        if (domChart) {
          // eslint-disable-next-line no-undef
          ctrl.homeChart = new Chart(domChart.getContext('2d'), {
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
              defaultFontFamily: "'Source Sans Pro', 'Helvetica Neue'," +
              " 'Helvetica', 'Arial', 'sans-serif'",
              legend: { display: false },
              tooltips: {
                callbacks: {
                  label: function (tooltipItem) {
                    return tooltipItem.yLabel;
                  }
                }
              },
              hover: {
                onHover: function (e) {
                  // dynamic fix to have a pointer on the clickable bar charts
                  if (ctrl.homeChart.getElementAtEvent(e).length) {
                    domChart.style.cursor = e ? 'pointer' : 'default';
                  } else {
                    domChart.style.cursor = 'default';
                  }
                }
              },
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
            var activePoint = ctrl.homeChart.getElementAtEvent(e);
            if (activePoint.length && activePoint[0]._model) {
              $window.location.href = '/files/#?' + ctrl.selectedAttribute.select.solrName +
                '=' + activePoint[0]._model.label.join(' ');
            }
          };
        }
      }
    };
  }
})();
