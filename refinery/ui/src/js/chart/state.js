angular
  .module('refineryChart')
  .config([
    'refineryStateProvider',
    function (refineryStateProvider) {
      refineryStateProvider
        .state(
          'default',
          {
            url: '/',
            templateUrl: '/static/partials/chart/partials/charts-main.html',
            controller: 'refineryChartCtrl as chart'
          },
          '/chart-test/'
        )
        .state(
          'valid',
          {
            url: '/{mode}/',
            templateUrl: '/static/partials/chart/partials/charts-main.html',
            controller: 'refineryChartCtrl as chart'
          },
          '/chart-test/'
        );
    }
  ]
);