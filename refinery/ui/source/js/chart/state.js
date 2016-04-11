'use strict';

angular
  .module('refineryChart')
  .config([
    'refineryStateProvider',
    function (refineryStateProvider) {
      refineryStateProvider
        .state(
          'none', {
            url: '/',
            templateUrl: '/static/partials/chart/partials/charts-main.html',
            controller: 'refineryChartCtrl as chart'
          },
          '/fastqc_viewer/'
        )
        .state(
          'default', {
            url: '/{uuid}/',
            templateUrl: '/static/partials/chart/partials/charts-main.html',
            controller: 'refineryChartCtrl as chart'
          },
          '/fastqc_viewer/'
        )
        .state(
          'full', {
            url: '/{uuid}/{mode}/',
            templateUrl: '/static/partials/chart/partials/charts-main.html',
            controller: 'refineryChartCtrl as chart'
          },
          '/fastqc_viewer/'
      );
    }
  ]
);
