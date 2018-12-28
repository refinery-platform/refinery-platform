/**
 * Twitter Feed Ctrl
 * @namespace TwitterFeedCtrl
 * @desc component ctrl for the twitter feed.
 * @memberOf refineryApp.refineryHome
 */
(function () {
  'use strict';
  angular
    .module('refineryHome')
    .controller('TwitterFeedCtrl', TwitterFeedCtrl);

  TwitterFeedCtrl.$inject = ['_', '$window'];

  function TwitterFeedCtrl (_, $window) {
    var vm = this;
    vm.twitterId = '';

    vm.$onInit = function () {
      var djangoApp = $window.djangoApp;
      if (_.has(djangoApp, 'refineryTwitter') && djangoApp.refineryTwitter.length) {
        vm.twitterId = djangoApp.refineryTwitter;
      }
    };
  }
})();
