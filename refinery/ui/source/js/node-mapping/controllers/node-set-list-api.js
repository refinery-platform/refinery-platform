'use strict';

function NodeSetListApiCtrl ($log, $scope, $rootScope, $window, NodeSetList) {
  $scope.nodesetList = [];
  $scope.selectedNodeset = { select: $scope.nodesetList[0] };

  $scope.updateCurrentNodeSet = function () {
    $scope.currentNodeSet = $scope.selectedNodeset.select;
    // FIXME: temp workaround - this should be handled through the event bus
    if ($scope.currentNodeSet) {
      $rootScope.$emit('nodeSetChangedEvent', $scope.currentNodeSet);
    }
  };

  // helper method to refresh the selectedNodeSet from api refreshed nodesetList
  var refreshSelectedNodeSet = function () {
    for (var i = 0; i < $scope.nodesetList.length; i++) {
      if ($scope.selectedNodeset.select &&
        $scope.nodesetList[i].uuid === $scope.selectedNodeset.select.uuid) {
        $scope.selectedNodeset.select = $scope.nodesetList[i];
        break;
      }
    }
  };

  $scope.getCurrentNodeSet = function () {
    NodeSetList.get({
      study__uuid: $window.externalStudyUuid,
      assay__uuid: $window.externalAssayUuid
    }).$promise
      .then(function (data) {
        angular.copy(data.objects, $scope.nodesetList);
        refreshSelectedNodeSet();
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
