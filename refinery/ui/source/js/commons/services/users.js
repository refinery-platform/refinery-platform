'use strict';

function userFactory ($q, $resource, _, settings) {
  var userService = {};
  var userResource = $resource(
    settings.appRoot + settings.refineryApi + '/users/:uuid/',
    {
      format: 'json'
    },
    {
      query: {
        method: 'GET',
        isArray: false
      }
    }
  );
  var store = {};

  /**
   * Query the API for user and user profile data.
   *
   * @method  getUserData
   * @author  Fritz Lekschas
   * @date    2015-10-21
   *
   * @param   {String}  uuid  User profile uuid.
   * @return  {Object}        Angular promise resolving API data.
   */
  function getUserData (uuid) {
    return userResource.get({
      uuid: uuid
    }).$promise;
  }

  /**
   * Get user data.
   *
   * @method  get
   * @author  Fritz Lekschas
   * @date    2015-10-21
   *
   * @param   {String}  uuid  User profile uuid.
   * @return  {Object}        Angular promise resolving unified data.
   */
  userService.get = function (uuid) {
    if (store[uuid] === undefined) {
      return getUserData(uuid).then(function (data) {
        if (_.has(data, 'user')) {
          store[uuid] = {
            affiliation: data.affiliation,
            email: data.user.email,
            firstName: data.user.first_name,
            fullName: (data.user.first_name + ' ' + data.user.last_name).trim(),
            lastName: data.user.last_name,
            userId: data.user.id,
            userName: data.user.username,
            userProfileUuid: data.uuid
          };
        }
        return store[uuid];
      });
    }
    return $q.when(store[uuid]);
  };

  return userService;
}

angular
  .module('refineryApp')
  .factory('userService', ['$q', '$resource', '_', 'settings', userFactory]);
