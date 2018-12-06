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

  HomeCtrl.$inject = ['MarkdownJS', '$window'];

  function HomeCtrl (MarkdownJS, $window) {
    var vm = this;

    vm.$onInit = function () {
      if ($window.djangoApp && $window.djangoApp.refineryIntro.length) {
        var introParagraphs = $window.djangoApp.refineryIntro.split('   ');
        vm.htmlIntros = [];
        for (var i = 0; i < introParagraphs.length; i++) {
          vm.htmlIntros[i] = MarkdownJS.toHTML(introParagraphs[i]);
        }
      }
    };
  }
})();
