angular
  .module('refineryChart')
  .config([
    'refineryStateProvider',
    function (refineryStateProvider) {
      refineryStateProvider
        .state(
          'none',
          {
            url: '/',
            templateUrl: '/static/partials/chart/partials/charts-main.html',
            controller: 'refineryChartCtrl as chart'
          },
          '/chart-test/'
        )
        .state(
          'default',
          {
            url: '/{uuid}/',
            templateUrl: '/static/partials/chart/partials/charts-main.html',
            controller: 'refineryChartCtrl as chart'
          },
          '/chart-test/'
        )
        .state(
          'full',
          {
            url: '/{uuid}/{mode}/',
            templateUrl: '/static/partials/chart/partials/charts-main.html',
            controller: 'refineryChartCtrl as chart'
          },
          '/chart-test/'
        );
    }
  ]
);