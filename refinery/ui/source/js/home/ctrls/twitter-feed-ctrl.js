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

  TwitterFeedCtrl.$inject = ['_', '$scope', '$window', 'homeConfigService'];

  function TwitterFeedCtrl (_, $scope, $window, homeConfigService) {
    var vm = this;
    vm.twitterId = '';


  /*
   * -----------------------------------------------------------------------------
   * Watchers
   * -----------------------------------------------------------------------------
   */
    $scope.$watchCollection(
      function () {
        return homeConfigService.homeConfig;
      },
      function (updatedHomeConfig) {
        vm.twitterId = updatedHomeConfig.twitter_username;
      }
    );
  }
})();
