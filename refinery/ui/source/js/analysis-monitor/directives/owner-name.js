'use strict';

function rpAnalysisOwnerName (userService) {
  return {
    restrict: 'A',
    link: function (scope) {
      var ownerUuid = scope.analysis.owner;
      var ownerObj = {};
      scope.ownerName = '';

      userService.get(ownerUuid).then(function (response) {
        ownerObj = response;
        if (ownerObj.firstName !== '' || ownerObj.lastName !== '') {
          scope.ownerName = ownerObj.firstName + ' ' + ownerObj.lastName;
        } else {
          scope.ownerName = ownerObj.userName;
        }
      });
    }
  };
}

angular
  .module('refineryAnalysisMonitor')
  .directive('rpAnalysisOwnerName', [
    'userService',
    rpAnalysisOwnerName
  ]);
