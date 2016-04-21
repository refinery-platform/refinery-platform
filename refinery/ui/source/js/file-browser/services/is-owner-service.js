'use strict';

function isOwnerService (dataSetService, $window) {
  var vm = this;
  vm.isOwner = false;

  vm.refreshDataSetOwner = function () {
    var params = { uuid: $window.dataSetUuid };
    var dataSet = dataSetService.query(params);
    dataSet.$promise.then(function (response) {
      vm.isOwner = response.objects[0].is_owner;
    });
    return dataSet.$promise;
  };
}

angular.module('refineryFileBrowser')
  .service('isOwnerService', [
    'dataSetService',
    '$window',
    isOwnerService
  ]
);
