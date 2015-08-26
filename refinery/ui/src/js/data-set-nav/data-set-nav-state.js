angular
  .module('refineryDataSetNav')
  .controller(
    'refineryDataSetNavFilesCtrl',
    [
      '$scope',
      '$rootScope',
      '$timeout',
      '$window',
      '$',
      '$state',
      function($scope, $rootScope, $timeout, $window, $, $state) {
        $rootScope.mode = "browse";
        $rootScope.showCtrlTab = false;
        $rootScope.mainTabSpanSize = "span12 no-margin";
        $rootScope.ctrlTabSpanSize = "";

        // calls global resizing function implemented in base.html to rescale
        // height of scrollable elements timeout is needed to execute after DOM
        // changes
        $timeout(sizing, 0);

        $($window).trigger('refinery/floatThead/reflow');
      }
    ]
  );

angular
  .module('refineryDataSetNav')
  .controller(
    'refineryDataSetNavFilesBrowseCtrl',
    [
      '$scope',
      '$rootScope',
      '$timeout',
      '$window',
      '$',
      '$state',
      function($scope, $rootScope, $timeout, $window, $, $state) {
        $('#filesTab').addClass('active');
        $rootScope.mode = "browse";
        $rootScope.showCtrlTab = false;
        $rootScope.mainTabSpanSize = "span12 no-margin";
        $rootScope.ctrlTabSpanSize = "";

        // calls global resizing function implemented in base.html to rescale
        // height of scrollable elements timeout is needed to execute after DOM
        // changes
        $timeout(sizing, 0);

        $($window).trigger('refinery/floatThead/reflow');
      }
    ]
  );

angular
  .module('refineryDataSetNav')
  .controller(
    'refineryDataSetNavAnalyzeCtrl',
    [
      '$scope',
      '$rootScope',
      '$timeout',
      '$window',
      '$',
      '$state',
      function($scope, $rootScope, $timeout, $window, $, $state) {
        $('#filesTab').addClass('active');
        $rootScope.mode = "analyze";
        $rootScope.showCtrlTab = true;
        $rootScope.mainTabSpanSize = "span10";
        $rootScope.ctrlTabSpanSize = "span2";

        // calls global resizing function implemented in base.html to rescale
        // height of scrollable elements timeout is needed to execute after DOM
        // changes
        $timeout(sizing, 0);

        $($window).trigger('refinery/floatThead/reflow');
      }
    ]
  );

angular
  .module('refineryDataSetNav')
  .controller(
    'refineryDataSetNavVisualizeCtrl',
    [
      '$scope',
      '$rootScope',
      '$timeout',
      '$window',
      '$',
      '$state',
      function($scope, $rootScope, $timeout, $window, $, $state) {
        $('#filesTab').addClass('active');
        $rootScope.mode = "visualize";
        $rootScope.showCtrlTab = true;
        $rootScope.mainTabSpanSize = "span10";
        $rootScope.ctrlTabSpanSize = "span2";

        // calls global resizing function implemented in base.html to rescale
        // height of scrollable elements timeout is needed to execute after DOM
        // changes
        $timeout(sizing, 0);

        $($window).trigger('refinery/floatThead/reflow');
      }
    ]
  );

angular
  .module('refineryDataSetNav')
  .config(['refineryStateProvider', 'refineryUrlRouterProvider',
    function (refineryStateProvider, refineryUrlRouterProvider) {

      refineryStateProvider
        .state(
          'files',
          {
            url: '/files/',
            templateUrl: '/static/partials/data_set_ui_mode_browse.html',
            controller: 'refineryDataSetNavFilesCtrl'
          },
          '^\/data_sets\/.*\/$',
          true
        )
        .state(
          'browse',
          {
            url: '/files/browse',
            templateUrl: '/static/partials/data_set_ui_mode_browse.html',
            controller: 'refineryDataSetNavFilesBrowseCtrl'
          },
          '^\/data_sets\/.*\/$',
          true
        )
        .state(
          'analyze',
          {
            url: '/files/analyze/',
            templateUrl: '/static/partials/data_set_ui_mode_analyze.html',
            controller: 'refineryDataSetNavAnalyzeCtrl'
          },
          '^\/data_sets\/.*\/$',
          true
          )
        .state(
          'visualize',
          {
            templateUrl: "/static/partials/data_set_ui_mode_visualize.html",
            url: '/files/visualize/',
            controller: 'refineryDataSetNavVisualizeCtrl'
          },
          '^\/data_sets\/.*\/$',
          true
        )
        .state(
          'analyses',
          {
            url: '/analyses/',
            templateUrl: '/static/partials/analyses/partials/analyses-list.html',
          },
          '^\/data_sets\/.*\/$',
          true
        )
        .state(
          'attributes',
          {
            url: '/attributes/',
          },
          '^\/data_sets\/.*\/$',
          true
        )
        .state(
          'downloads',
          {
            url: '/downloads/',
          },
          '^\/data_sets\/.*\/$',
          true
        )
        .state(
          'details',
          {
            url: '/details/',
          },
          '^\/data_sets\/.*\/$',
          true
        )
        .state(
          'sharing',
          {
            url: '/sharing/',
          },
          '^\/data_sets\/.*\/$',
          true
        );

      refineryUrlRouterProvider
        .otherwise(
          '/files/browse',
          '^\/data_sets\/.*\/$',
          true
        );
    }
  ]
);
