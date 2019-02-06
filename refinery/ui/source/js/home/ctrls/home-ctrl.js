/**
 * Home Ctrl
 * @namespace HomeCtrl
 * @desc Main ctrl for the home view
 * @memberOf refineryApp.refineryHome
 */
(function () {
  'use strict';
  angular
    .module('refineryHome')
    .controller('HomeCtrl', HomeCtrl);

  HomeCtrl.$inject = [
    '_',
    '$log',
    'MarkdownJS',
    '$window',
    'homeConfigService',
    'settings'
  ];

  function HomeCtrl (
    _,
    $log,
    MarkdownJS,
    $window,
    homeConfigService,
    settings
  ) {
    var vm = this;
    vm.isLoggedIn = settings.djangoApp.userId !== undefined;
    vm.aboutHTML = MarkdownJS.toHTML(homeConfigService.homeConfig.aboutMarkdown);
    vm.introHTML = MarkdownJS.toHTML(homeConfigService.homeConfig.introMarkdown);

    activate();
    /*
     * -----------------------------------------------------------------------------
     * Methods
     * -----------------------------------------------------------------------------
    */
    function activate () {
      refreshConfigs();
    }

    /**
     * @name refreshConfigs
     * @desc Private method to initalize the custom text on homepage
     * @memberOf refineryHome.refreshConfigs
    **/
    function refreshConfigs () {
      homeConfigService.getConfigs().then(function () {
        vm.aboutHTML = MarkdownJS.toHTML(homeConfigService.homeConfig.aboutMarkdown);
        vm.introHTML = MarkdownJS.toHTML(homeConfigService.homeConfig.introMarkdown);
      }, function (error) {
        $log.error('Error retrieving home configs: ' + error);
      });
    }

    vm.$onInit = function () {
      var djangoApp = $window.djangoApp;
      if (_.has(djangoApp, 'refineryInstanceName') && djangoApp.refineryInstanceName.length) {
        vm.instanceName = djangoApp.refineryInstanceName;
      }
    };
  }
})();
