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

  HomeCtrl.$inject = ['$window'];

  function HomeCtrl ($window) {
    var vm = this;
    vm.wtf = 'wtf';

    console.log($window.djangoApp.refineryIntro);

    vm.$onInit = function () {
      vm.introParagraph = $window.djangoApp.refineryIntro;
      console.log('on init');
    };
  }
})();
