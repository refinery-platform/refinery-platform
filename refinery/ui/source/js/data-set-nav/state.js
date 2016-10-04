'use strict';

function refineryDataSetNavConfig (
  refineryStateProvider, refineryUrlRouterProvider
) {
  refineryStateProvider
    .state(
      'files', {
        url: '/files/',
        templateUrl:
          '/static/partials/data-set-nav/partials/data-set-ui-mode-browse.html',
        controller: 'refineryDataSetNavFilesCtrl'
      },
      '^\/data_sets\/.*\/$',
      true
    )
    .state(
      'browse', {
        url: '/files/browse',
        templateUrl:
          '/static/partials/data-set-nav/partials/data-set-ui-mode-browse.html',
        controller: 'refineryDataSetNavFilesBrowseCtrl'
      },
      '^\/data_sets\/.*\/$',
      true
    )
    .state(
      'analyze', {
        url: '/files/analyze/',
        templateUrl:
          '/static/partials/data-set-nav/partials/data-set-ui-mode-analyze.html',
        controller: 'refineryDataSetNavAnalyzeCtrl'
      },
      '^\/data_sets\/.*\/$',
      true
    )
    .state(
      'visualize', {
        templateUrl:
          '/static/partials/data-set-nav/partials/data-set-ui-mode-visualize.html',
        url: '/files/visualize/',
        controller: 'refineryDataSetNavVisualizeCtrl'
      },
      '^\/data_sets\/.*\/$',
      true
    )
    .state(
      'analyses', {
        url: '/analyses/',
        templateUrl:
          '/static/partials/analysis-monitor/partials/analyses-list.html',
        controller: 'refineryDataSetNavBlueprintCtrl'
      },
      '^\/data_sets\/.*\/$',
      true
    )
    .state(
      'attributes', {
        url: '/attributes/',
        controller: 'refineryDataSetNavBlueprintCtrl'
      },
      '^\/data_sets\/.*\/$',
      true
    )
    .state(
      'details', {
        url: '/details/',
        controller: 'refineryDataSetNavBlueprintCtrl'
      },
      '^\/data_sets\/.*\/$',
      true
    )
    .state(
      'sharing', {
        url: '/sharing/',
        controller: 'refineryDataSetNavBlueprintCtrl'
      },
      '^\/data_sets\/.*\/$',
      true
    )
    .state(
      'files', {
        url: '/files/',
        templateUrl:
          '/static/partials/file-browser/views/files-tab.html',
        controller: 'FileBrowserCtrl',
        controllerAs: 'FBCtrl'
      },
      '^\/data_sets2\/.*\/$',
      true
    )
    .state(
      'analyses', {
        url: '/analyses/',
        templateUrl:
          '/static/partials/analysis-monitor/views/analyses-tab.html',
        controller: 'AnalysisMonitorCtrl',
        controllerAs: 'AMCtrl'
      },
      '^\/data_sets2\/.*\/$',
      true
    )
    .state(
      'about', {
        url: '/about/',
        templateUrl:
          '/static/partials/data-set-about/views/details-tab.html',
        controller: 'AboutDetailsCtrl',
        controllerAs: 'ADCtrl'
      },
      '^\/data_sets2\/.*\/$',
      true
    );

  refineryUrlRouterProvider
    .otherwise(
      '/files/browse',
      '^\/data_sets\/.*\/$',
      true
    )
    .otherwise(
      '/files/',
      '^\/data_sets2\/.*\/$',
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
