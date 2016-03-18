function NodeSetListApiCtrl ($scope, $rootScope, $window, NodeSetList) {
  'use strict';

  $scope.updateCurrentNodeSet = function () {
    $scope.currentNodeSet = $scope.nodesetList[$scope.nodesetIndex];
    // FIXME: temp workaround - this should be handled through the event bus
    if ($scope.currentNodeSet) {
      $rootScope.$emit('nodeSetChangedEvent', $scope.currentNodeSet);
    }
  };

  $scope.getCurrentNodeSet = function () {
    NodeSetList.get({
      study__uuid: externalStudyUuid, assay__uuid: externalAssayUuid
    }).$promise
      .then(function (data) {
        $scope.nodesetList = data.objects;
        $scope.updateCurrentNodeSet();
      })
      .catch(function (error) {
        console.log('Couldn\'t read node set list.');
        if ($window.sessionStorage) {
          var currentSelectionSessionKey = (
            externalStudyUuid + '_' +
            externalAssayUuid + '_' +
            'currentSelection'
          );

          console.log(
            'Reading ' + currentSelectionSessionKey + ' from session storage'
          );

          $scope.nodesetList = [angular.fromJson(
            $window.sessionStorage.getItem(currentSelectionSessionKey)
          )];

          $scope.updateCurrentNodeSet();
        } else {
          console.log(error);
        }
      });
  };

  $scope.$on('refinery/updateCurrentNodeSelection', $scope.getCurrentNodeSet);

  $scope.getCurrentNodeSet();
}

angular
  .module('refineryNodeMapping')
  .controller('NodeSetListApiCtrl', [
    '$scope', '$rootScope', '$window', 'NodeSetList', NodeSetListApiCtrl
  ]);
