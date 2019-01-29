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
    'MarkdownJS',
    '$window',
    'homeConfigService',
    'settings'
  ];

  function HomeCtrl (
    _,
    MarkdownJS,
    $window,
    homeConfigService,
    settings
  ) {
    var vm = this;
    vm.isLoggedIn = settings.djangoApp.userId !== undefined;

    activate();
    /*
     * -----------------------------------------------------------------------------
     * Methods
     * -----------------------------------------------------------------------------
    */
    function activate () {
      homeConfigService.getConfigs().then(function () {
        vm.htmlIntro = MarkdownJS.toHTML(homeConfigService.homeConfig.intro_markdown);
        vm.htmlAbout = MarkdownJS.toHTML(homeConfigService.homeConfig.about_markdown);
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
