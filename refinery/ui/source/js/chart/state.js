'use strict';

angular
  .module('refineryChart')
  .config([
    'refineryStateProvider', '$windowProvider',
    function (refineryStateProvider, $windowProvider) {
      var $window = $windowProvider.$get();
      refineryStateProvider
        .state(
          'none', {
            url: '/',
            templateUrl: function () {
              return $window.getStaticUrl('partials/chart/partials/charts-main.html');
            },
            controller: 'refineryChartCtrl as chart'
          },
          '/fastqc_viewer/'
        )
        .state(
          'default', {
            url: '/{uuid}/',
            templateUrl: function () {
              return $window.getStaticUrl('partials/chart/partials/charts-main.html');
            },
            controller: 'refineryChartCtrl as chart'
          },
          '/fastqc_viewer/'
        )
        .state(
          'full', {
            url: '/{uuid}/{mode}/',
            templateUrl: function () {
              return $window.getStaticUrl('partials/chart/partials/charts-main.html');
            },
            controller: 'refineryChartCtrl as chart'
          },
          '/fastqc_viewer/'
      );
    }
  ]
);
