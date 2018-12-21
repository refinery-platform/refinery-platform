/**
 * Current User Service
 * @namespace currentUserService
 * @desc Service which gets and stores the current user's profile.
 * @memberOf refineryApp
 */
(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('currentUserService', currentUserService);

  currentUserService.$inject = ['_', '$http', '$log', '$q', 'settings'];

  function currentUserService (
    _,
    $http,
    $log,
    $q,
    settings
  ) {
    // expected api structure
    var anonUser = {
      id: null,
      username: '',
      first_name: '',
      last_name: '',
      profile: {
        uuid: '',
        primary_group: { id: null, name: '' }
      },
      has_viewed_collaboration_tut: false,
      has_viewed_data_upload_tut: false,
      has_viewed_launchpad_tut: false
    };
    var currentUser = anonUser;

    var service = {
      anonUser: anonUser,
      currentUser: currentUser,
      getCurrentUser: getCurrentUser
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    /**
     * @name getCurrentUser
     * @desc Common service which tracks the current user based on the userId
     * @memberOf refineryApp.currentUserService
     **/
    function getCurrentUser () {
      var userId = settings.djangoApp.userId;
      var def = $q.defer();
      if (currentUser.id !== userId && userId !== anonUser.id) {
        return $http({
          method: 'GET',
          url: settings.refineryApiV2 + '/user/'
        }).then(function (response) {
          angular.copy(response.data, currentUser);
        }, function (error) {
          $log.error(error);
        });
      } else if (userId === anonUser.id) {
        currentUser = anonUser;
      }
      def.resolve(currentUser);
      return def.promise;
    }
  }
})();
