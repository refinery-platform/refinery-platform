/**
 * Twitter Feed Component
 * @namespace rpTwitterFeed
 * @desc Twitter feed component using a twitter id from djangoApp config.
 * @memberOf refineryApp.refineryHome
 */
(function () {
  'use strict';
  angular
    .module('refineryHome')
    .component('rpTwitterFeed', {
      controller: 'TwitterFeedCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/home/partials/twitter-feed.html');
      }]
    });
})();
