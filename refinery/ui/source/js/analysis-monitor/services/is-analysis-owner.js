'use strict';

function isAnalysisOwnerService (analysisService) {
  var vm = this;
  vm.isOwner = false;

  vm.refreshDataSetOwner = function (analysisUuid) {
    var params = { uuid: analysisUuid };
    var analysis = analysisService.query(params);
    analysis.$promise.then(function (response) {
      vm.isOwner = response.objects[0].is_owner;
    });
    return analysis.$promise;
  };
}

angular.module('refineryAnalysisMonitor')
  .service('isAnalysisOwnerService', [
    'analysisService',
    isAnalysisOwnerService
  ]
);
