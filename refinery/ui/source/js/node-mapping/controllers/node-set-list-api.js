'use strict';

function NodeSetListApiCtrl ($log, $scope, $rootScope, $window, NodeSetList) {
  $scope.updateCurrentNodeSet = function () {
    $scope.currentNodeSet = $scope.nodesetList[$scope.nodesetIndex];
    // FIXME: temp workaround - this should be handled through the event bus
    if ($scope.currentNodeSet) {
      $rootScope.$emit('nodeSetChangedEvent', $scope.currentNodeSet);
    }
  };

  $scope.getCurrentNodeSet = function () {
    NodeSetList.get({
      study__uuid: $window.externalStudyUuid,
      assay__uuid: $window.externalAssayUuid
    }).$promise
      .then(function (data) {
        $scope.nodesetList = data.objects;
        $scope.updateCurrentNodeSet();
      })
      .catch(function (error) {
        if ($window.sessionStorage) {
          var currentSelectionSessionKey = (
          $window.externalStudyUuid + '_' +
            $window.externalAssayUuid + '_' +
            'currentSelection'
          );

          $scope.nodesetList = [angular.fromJson(
            $window.sessionStorage.getItem(currentSelectionSessionKey)
          )];

          $scope.updateCurrentNodeSet();
        } else {
          $log.log(error);
        }
      });
  };

  $scope.$on('refinery/updateCurrentNodeSelection', $scope.getCurrentNodeSet);

  $scope.getCurrentNodeSet();
}

angular
  .module('refineryNodeMapping')
  .controller('NodeSetListApiCtrl', [
    '$log', '$scope', '$rootScope', '$window', 'NodeSetList', NodeSetListApiCtrl
  ]);
