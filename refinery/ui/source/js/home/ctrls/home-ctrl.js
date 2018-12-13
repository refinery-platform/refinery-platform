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

  HomeCtrl.$inject = ['_', 'MarkdownJS', '$window'];

  function HomeCtrl (_, MarkdownJS, $window) {
    var vm = this;

    vm.$onInit = function () {
      var djangoApp = $window.djangoApp;
      if (_.has(djangoApp, 'refineryIntro') && djangoApp.refineryIntro.length) {
        var introParagraphs = $window.djangoApp.refineryIntro.split('   ');
        vm.htmlIntros = [];
        for (var i = 0; i < introParagraphs.length; i++) {
          vm.htmlIntros[i] = MarkdownJS.toHTML(introParagraphs[i]);
        }
      }
    };
  }
})();
