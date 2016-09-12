/**
 * Created by scott on 7/21/16.
 */
'use strict';
function updateUserTutorials ($log, $http) {
  var updateUser = function (data) {
    $http.defaults.headers.put['Content-Type'] = 'application/json';
    $http.put('/api/v1/users/' + data.uuid + '/?format=json', data)
      .success(function () {
        $log.info('User\'s tutorial-viewing status updated successfully!');
      })
      .error(function () {
        $log.error('User\'s tutorial-viewing status not updated properly!');
      });
  };
  return {
    updateUser: updateUser
  };
}

angular
.module('refineryDashboard')
.factory(
  'updateUserTutorials',
  [
    '$log',
    '$http',
    updateUserTutorials
  ]
);
