'use strict';

function refineryDataSetNavConfig (
  refineryStateProvider, refineryUrlRouterProvider
) {
  refineryStateProvider
    .state(
      'files', {
        url: '/files/',
        templateUrl: function () {
          // unit tests redefine $window and thus make it unusable here
          return window.getStaticUrl('partials/file-browser/views/files-tab.html');
        },
        controller: 'FileBrowserCtrl',
        controllerAs: 'FBCtrl'
      },
      '^\/data_sets\/.*\/$',
      true
    )
    .state(
      'analyses', {
        url: '/analyses/',
        templateUrl: function () {
          // unit tests redefine $window and thus make it unusable here
          return window.getStaticUrl('partials/analysis-monitor/views/analyses-tab.html');
        },
        controller: 'AnalysisMonitorCtrl',
        controllerAs: 'AMCtrl'
      },
      '^\/data_sets\/.*\/$',
      true
    )
    .state(
      'visualizations', {
        url: '/visualizations/',
        templateUrl: function () {
          return window.getStaticUrl('partials/data-set-visualization/visualization-tab.html');
        }
      },
      '^\/data_sets\/.*\/$',
      true
    )
    .state(
      'about', {
        url: '/about/',
        templateUrl: function () {
          // unit tests redefine $window and thus make it unusable here
          return window.getStaticUrl('partials/data-set-about/views/details-tab.html');
        },
        controller: 'AboutDetailsCtrl',
        controllerAs: 'ADCtrl'
      },
      '^\/data_sets\/.*\/$',
      true
    )
    .state(
        'provvis', {
          url: '/provvis/',
          templateUrl: function () {
            // unit tests redefine $window and thus make it unusable here
            return window.getStaticUrl('partials/provvis/views/provvis-tab.html');
          },
          controller: 'ProvvisController',
          controllerAs: 'provCtrl'
        },
        '^\/data_sets\/.*\/$',
        true
      );

  refineryUrlRouterProvider
    .otherwise(
      '/files/',
      '^\/data_sets\/.*\/$',
      true
  );
}

angular
  .module('refineryDataSetNav')
  .config([
    'refineryStateProvider',
    'refineryUrlRouterProvider',
    refineryDataSetNavConfig
  ]);
