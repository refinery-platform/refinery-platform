'use strict';

// not used since delete functionality is not implemented in the backend yet
function RefineryFileDestroyCtrl ($scope, $http) {
  var file = $scope.file;
  var state;
  if (file.url) {
    file.$state = function () {
      return state;
    };
    file.$destroy = function () {
      state = 'pending';
      return $http({
        url: file.deleteUrl,
        method: file.deleteType
      }).then(
        function () {
          state = 'resolved';
          $scope.clear(file);
        },
        function () {
          state = 'rejected';
        }
      );
    };
  } else if (!file.$cancel && !file._index) {
    file.$cancel = function () {
      $scope.clear(file);
    };
  }
}

angular
  .module('refineryDataSetImport')
  .controller('RefineryFileDestroyCtrl', [
    '$scope',
    '$http',
    RefineryFileDestroyCtrl
  ]);
