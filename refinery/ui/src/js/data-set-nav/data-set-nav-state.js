angular
  .module('refineryDataSetNav')
  .config([
    '$stateProvider', '$urlRouterProvider',
    function ($stateProvider, $urlRouterProvider) {

      // Default state
      $urlRouterProvider.otherwise(function($injector) {
        var $state = $injector.get('$state');
        $state.go('browse');
      });

      $stateProvider
        .state(
          'files',{
          url: '/files/',
          templateUrl: '/static/partials/data_set_ui_mode_browse.html',
          controller: function($scope, $rootScope, $timeout, $, $state) {
            $rootScope.mode = "browse";
            $rootScope.showCtrlTab = false;
            $rootScope.mainTabSpanSize = "span12 no-margin";
            $rootScope.ctrlTabSpanSize = "";

            // calls global resizing function implemented in base.html to rescale height of scrollable elements
            // timeout is needed to execute after DOM changes
            $timeout(sizing, 0);

            $(window).trigger('refinery/floatThead/reflow');
          }
         })
        .state(
          'browse', {
          url: '/files/',
          templateUrl: '/static/partials/data_set_ui_mode_browse.html',
          controller: function($scope, $rootScope, $timeout, $, $state) {
            $('#filesTab').addClass('active');
            $rootScope.mode = "browse";
            $rootScope.showCtrlTab = false;
            $rootScope.mainTabSpanSize = "span12 no-margin";
            $rootScope.ctrlTabSpanSize = "";

            // calls global resizing function implemented in base.html to rescale height of scrollable elements
            // timeout is needed to execute after DOM changes
            $timeout(sizing, 0);

            $(window).trigger('refinery/floatThead/reflow');
          }
        })
        .state('analyze', {
          url: '/files/analyze/',
          templateUrl: '/static/partials/data_set_ui_mode_analyze.html',
          controller: function($scope, $rootScope, $timeout, $window, $, $state) {
            $('#filesTab').addClass('active');
            $rootScope.mode = "analyze";
            $rootScope.showCtrlTab = true;
            $rootScope.mainTabSpanSize = "span10";
            $rootScope.ctrlTabSpanSize = "span2";


            // calls global resizing function implemented in base.html to rescale height of scrollable elements
            // timeout is needed to execute after DOM changes
            $timeout(sizing, 0);

            $(window).trigger('refinery/floatThead/reflow');
          }
        })
        .state(
          'visualize', {
          templateUrl: "/static/partials/data_set_ui_mode_visualize.html",
          url: '/files/visualize/',
          controller: function($scope,$rootScope,$timeout, $window, $, $state) {
            $rootScope.ctrlTabSpanSize = "span2";
            $('#filesTab').addClass('active');
            $rootScope.mode = "visualize";
            $rootScope.showCtrlTab = true;
            $rootScope.mainTabSpanSize = "span10";

            // calls global resizing function implemented in base.html to rescale height of scrollable elements
            // timeout is needed to execute after DOM changes
            $timeout(sizing, 0);

            $(window).trigger('refinery/floatThead/reflow');
          }
        })
        .state(
          'analyses',
          {
            url: '/analyses/',
            templateUrl: '/static/partials/analyses/partials/analyses-list.html',
          }
      )
      .state(
          'attributes',
          {
            url: '/attributes/',
            }
      )
      .state(
          'downloads',
          {
            url: '/downloads/',
            }
      )
      .state(
          'details',
          {
            url: '/details/',
            }
      )
      .state(
          'sharing',
          {
            url: '/sharing/',
            }
      );
    }
  ]
);
