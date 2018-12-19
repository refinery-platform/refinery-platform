/**
 * Current User Service
 * @namespace currentUserService
 * @desc Service which gets the current user's profile.
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
    var anonUser = {
      id: 0, username: '', profile: { uuid: '', primary_group: { id: '', name: '' } },
      first_name: '', last_name: '',
      launchpad_tut_viewed: 'False', data_upload_tut_viewed: 'False',
    };
    var currentUser = anonUser;

    var service = {
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
      if (currentUser.id !== userId && userId !== 0) {
        return $http({
          method: 'GET',
          url: settings.refineryApiV2 + '/user/'
        }).then(function (response) {
          angular.copy(response.data, currentUser);
        }, function (error) {
          $log.error(error);
        });
      } else if (userId === 0) {
        currentUser = anonUser;
      }
      def.resolve(currentUser);
      return def.promise;
    }
  }
})();
