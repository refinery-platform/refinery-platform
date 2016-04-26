'use strict';

function analysisMonitorAlertService (analysisService) {
  var vm = this;
  var analysesMsg = {};
  analysesMsg.status = '';
  analysesMsg.name = '';

  vm.setAnalysesMsg = function (uuid) {
    vm.refreshAnalysesAlertStatus(uuid);
  };

  vm.getAnalysesMsg = function () {
    return analysesMsg;
  };

  vm.refreshAnalysesAlertStatus = function (uuid) {
    var analysis = analysisService.query({
      format: 'json',
      limit: 1,
      uuid: uuid
    });

    analysis.$promise.then(function (response) {
      analysesMsg.status = response.objects[0].status;
      analysesMsg.name = response.objects[0].name;
    });
    return analysis.$promise;
  };
}

angular
  .module('refineryAnalysisMonitor')
  .service('analysisMonitorAlertService', [
    'analysisService',
    analysisMonitorAlertService
  ]);
