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
        var introParagraphs = homeConfigService.homeConfig.intro_markdown.split('   ');
        vm.htmlIntroList = [];
        for (var i = 0; i < introParagraphs.length; i++) {
          vm.htmlIntroList[i] = MarkdownJS.toHTML(introParagraphs[i]);
        }

        var aboutParagraphs = homeConfigService.homeConfig.about_markdown.split('   ');
        vm.htmlAboutList = [];
        for (var j = 0; j < aboutParagraphs.length; j++) {
          vm.htmlAboutList[j] = MarkdownJS.toHTML(aboutParagraphs[j]);
        }
        console.log(vm.htmlAboutList);
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
